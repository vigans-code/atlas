import math

import torch
from torch import nn
from torch.nn import functional as F

from atlas_model.config import AtlasModelConfig


class RMSNorm(nn.Module):
    def __init__(self, width: int, epsilon: float = 1e-6) -> None:
        super().__init__()
        self.weight = nn.Parameter(torch.ones(width))
        self.epsilon = epsilon

    def forward(self, value: torch.Tensor) -> torch.Tensor:
        normalized = value * torch.rsqrt(value.pow(2).mean(dim=-1, keepdim=True) + self.epsilon)
        return normalized * self.weight


def rotary_frequencies(
    length: int, head_size: int, base: float, device
) -> tuple[torch.Tensor, torch.Tensor]:
    inverse = 1.0 / (base ** (torch.arange(0, head_size, 2, device=device).float() / head_size))
    positions = torch.arange(length, device=device).float()
    angles = torch.outer(positions, inverse)
    return angles.cos()[None, None, :, :], angles.sin()[None, None, :, :]


def apply_rotary(value: torch.Tensor, cosine: torch.Tensor, sine: torch.Tensor) -> torch.Tensor:
    even, odd = value[..., 0::2], value[..., 1::2]
    rotated = torch.stack((even * cosine - odd * sine, even * sine + odd * cosine), dim=-1)
    return rotated.flatten(-2)


class CausalAttention(nn.Module):
    def __init__(self, config: AtlasModelConfig) -> None:
        super().__init__()
        self.n_heads = config.n_heads
        self.head_size = config.d_model // config.n_heads
        if self.head_size % 2:
            raise ValueError("Attention head size must be even for rotary positions.")
        self.rope_base = config.rope_base
        self.dropout = config.dropout
        self.qkv = nn.Linear(config.d_model, config.d_model * 3, bias=False)
        self.output = nn.Linear(config.d_model, config.d_model, bias=False)

    def forward(self, value: torch.Tensor) -> torch.Tensor:
        batch, length, width = value.shape
        qkv = self.qkv(value).view(batch, length, 3, self.n_heads, self.head_size)
        query, key, values = qkv.unbind(dim=2)
        query, key, values = (item.transpose(1, 2) for item in (query, key, values))
        cosine, sine = rotary_frequencies(length, self.head_size, self.rope_base, value.device)
        query = apply_rotary(query, cosine, sine)
        key = apply_rotary(key, cosine, sine)
        attended = F.scaled_dot_product_attention(
            query,
            key,
            values,
            dropout_p=self.dropout if self.training else 0.0,
            is_causal=True,
        )
        return self.output(attended.transpose(1, 2).contiguous().view(batch, length, width))


class SwiGLU(nn.Module):
    def __init__(self, config: AtlasModelConfig) -> None:
        super().__init__()
        self.gate = nn.Linear(config.d_model, config.d_ff, bias=False)
        self.value = nn.Linear(config.d_model, config.d_ff, bias=False)
        self.output = nn.Linear(config.d_ff, config.d_model, bias=False)

    def forward(self, value: torch.Tensor) -> torch.Tensor:
        return self.output(F.silu(self.gate(value)) * self.value(value))


class TransformerBlock(nn.Module):
    def __init__(self, config: AtlasModelConfig) -> None:
        super().__init__()
        self.attention_norm = RMSNorm(config.d_model)
        self.attention = CausalAttention(config)
        self.feed_forward_norm = RMSNorm(config.d_model)
        self.feed_forward = SwiGLU(config)

    def forward(self, value: torch.Tensor) -> torch.Tensor:
        value = value + self.attention(self.attention_norm(value))
        return value + self.feed_forward(self.feed_forward_norm(value))


class AtlasTransformer(nn.Module):
    checkpoint_format = "atlas-scratch-v1"

    def __init__(self, config: AtlasModelConfig) -> None:
        super().__init__()
        self.config = config
        self.embedding = nn.Embedding(config.vocab_size, config.d_model)
        self.blocks = nn.ModuleList(TransformerBlock(config) for _ in range(config.n_layers))
        self.final_norm = RMSNorm(config.d_model)
        self.output = nn.Linear(config.d_model, config.vocab_size, bias=False)
        self.output.weight = self.embedding.weight
        self.apply(self._initialize)

    @staticmethod
    def _initialize(module: nn.Module) -> None:
        if isinstance(module, (nn.Linear, nn.Embedding)):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def forward(self, tokens: torch.Tensor, targets: torch.Tensor | None = None):
        if tokens.ndim != 2 or tokens.shape[1] > self.config.context_length:
            raise ValueError("Token batch exceeds the Atlas context window.")
        hidden = self.embedding(tokens)
        for block in self.blocks:
            hidden = block(hidden)
        logits = self.output(self.final_norm(hidden))
        loss = None
        if targets is not None:
            loss = F.cross_entropy(logits.flatten(0, 1), targets.flatten(), ignore_index=-1)
        return logits, loss

    @torch.inference_mode()
    def generate(
        self,
        tokens: torch.Tensor,
        max_new_tokens: int,
        temperature: float = 0.8,
        top_k: int = 40,
        stop_sequences: tuple[tuple[int, ...], ...] = (),
    ) -> torch.Tensor:
        self.eval()
        for _ in range(max_new_tokens):
            context = tokens[:, -self.config.context_length :]
            logits, _ = self(context)
            next_logits = logits[:, -1, :] / max(temperature, 1e-4)
            if top_k > 0:
                values, _ = torch.topk(next_logits, min(top_k, next_logits.shape[-1]))
                next_logits[next_logits < values[:, [-1]]] = -math.inf
            next_token = torch.multinomial(F.softmax(next_logits, dim=-1), num_samples=1)
            tokens = torch.cat((tokens, next_token), dim=1)
            if torch.all(next_token == 2):
                break
            if tokens.shape[0] == 1 and any(
                len(sequence) <= tokens.shape[1]
                and tuple(tokens[0, -len(sequence) :].tolist()) == sequence
                for sequence in stop_sequences
                if sequence
            ):
                break
        return tokens

    def parameter_count(self) -> int:
        return sum(parameter.numel() for parameter in self.parameters())
