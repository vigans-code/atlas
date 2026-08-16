import argparse
import hashlib
import math
import random
from pathlib import Path

import torch

from atlas_model.checkpoint import load_checkpoint, save_checkpoint
from atlas_model.config import AtlasModelConfig
from atlas_model.network import AtlasTransformer
from atlas_model.provenance import load_verified_corpus
from atlas_model.tokenizer import AtlasByteTokenizer


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train Atlas from random weights.")
    parser.add_argument("--manifest", type=Path, default=Path("data/manifest.json"))
    parser.add_argument("--output", type=Path, default=Path("checkpoints/atlas-v0.pt"))
    parser.add_argument("--resume", type=Path)
    parser.add_argument("--steps", type=int, default=2_000)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--learning-rate", type=float, default=3e-4)
    parser.add_argument("--seed", type=int, default=1337)
    parser.add_argument("--save-every", type=int, default=250)
    parser.add_argument("--eval-every", type=int, default=100)
    parser.add_argument("--eval-batches", type=int, default=8)
    parser.add_argument("--validation-fraction", type=float, default=0.05)
    parser.add_argument("--warmup-steps", type=int, default=100)
    parser.add_argument("--threads", type=int, default=4)
    parser.add_argument("--device", choices=("auto", "cpu", "cuda"), default="auto")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.steps < 1 or args.batch_size < 1 or args.eval_batches < 1:
        raise ValueError("Training steps and batch size must be positive.")
    if not 0.01 <= args.validation_fraction <= 0.25:
        raise ValueError("Validation fraction must be between 0.01 and 0.25.")
    random.seed(args.seed)
    torch.manual_seed(args.seed)
    torch.set_num_threads(max(1, min(args.threads, torch.get_num_threads())))
    device = "cuda" if args.device == "auto" and torch.cuda.is_available() else args.device
    if device == "auto":
        device = "cpu"
    if device == "cuda" and not torch.cuda.is_available():
        raise ValueError("CUDA was requested but is unavailable.")

    corpus, sources = load_verified_corpus(args.manifest)
    corpus_hash = hashlib.sha256(corpus.encode("utf-8")).hexdigest()
    tokenizer = AtlasByteTokenizer()
    encoded = tokenizer.encode(corpus, add_bos=True, add_eos=True)
    config = AtlasModelConfig()
    if len(encoded) <= config.context_length + 1:
        repeats = (config.context_length * 4 // max(1, len(encoded))) + 2
        encoded *= repeats
    split_index = int(len(encoded) * (1 - args.validation_fraction))
    if (
        split_index <= config.context_length + 1
        or len(encoded) - split_index <= config.context_length + 1
    ):
        raise ValueError("The verified corpus is too small for train and validation windows.")
    train_data = torch.tensor(encoded[:split_index], dtype=torch.long)
    validation_data = torch.tensor(encoded[split_index:], dtype=torch.long)

    if args.resume:
        model, metadata = load_checkpoint(args.resume, device=device)
        if metadata["corpus_sha256"] != corpus_hash:
            raise ValueError("The resume checkpoint was trained on a different verified corpus.")
        start_step = int(metadata["step"])
    else:
        model = AtlasTransformer(config).to(device)
        start_step = 0
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=args.learning_rate,
        betas=(0.9, 0.95),
        weight_decay=0.1,
    )
    training_state = metadata.get("training_state") if args.resume else None
    if isinstance(training_state, dict) and "optimizer" in training_state:
        optimizer.load_state_dict(training_state["optimizer"])
    model.train()
    print(f"Atlas parameters: {model.parameter_count():,}")
    print(f"Verified corpus sources: {len(sources)}; bytes: {len(corpus.encode('utf-8')):,}")
    print(
        f"Device: {device}; train tokens: {len(train_data):,}; "
        f"validation tokens: {len(validation_data):,}"
    )

    final_step = start_step + args.steps
    last_validation_loss: float | None = None

    for step in range(start_step + 1, start_step + args.steps + 1):
        inputs, targets = sample_batch(train_data, config.context_length, args.batch_size, device)
        learning_rate = scheduled_learning_rate(
            step,
            warmup_steps=args.warmup_steps,
            final_step=final_step,
            peak=args.learning_rate,
        )
        for group in optimizer.param_groups:
            group["lr"] = learning_rate
        _, loss = model(inputs, targets)
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        if step == 1 or step % 25 == 0:
            print(f"step={step} loss={loss.item():.4f} lr={learning_rate:.6f}", flush=True)
        if step % args.eval_every == 0 or step == final_step:
            last_validation_loss = evaluate(
                model,
                validation_data,
                context_length=config.context_length,
                batch_size=args.batch_size,
                batches=args.eval_batches,
                device=device,
            )
            print(f"step={step} validation_loss={last_validation_loss:.4f}", flush=True)
        if step % args.save_every == 0:
            save_checkpoint(
                args.output,
                model,
                step=step,
                corpus_sha256=corpus_hash,
                training_state={"optimizer": optimizer.state_dict()},
                validation_loss=last_validation_loss,
            )

    save_checkpoint(
        args.output,
        model,
        step=final_step,
        corpus_sha256=corpus_hash,
        training_state={"optimizer": optimizer.state_dict()},
        validation_loss=last_validation_loss,
    )
    print(f"Saved Atlas-only checkpoint: {args.output}")


def sample_batch(
    data: torch.Tensor,
    context_length: int,
    batch_size: int,
    device: str,
) -> tuple[torch.Tensor, torch.Tensor]:
    starts = torch.randint(0, len(data) - context_length - 1, (batch_size,))
    inputs = torch.stack([data[index : index + context_length] for index in starts]).to(device)
    targets = torch.stack([data[index + 1 : index + context_length + 1] for index in starts]).to(
        device
    )
    return inputs, targets


def scheduled_learning_rate(step: int, *, warmup_steps: int, final_step: int, peak: float) -> float:
    if warmup_steps > 0 and step <= warmup_steps:
        return peak * step / warmup_steps
    progress = (step - warmup_steps) / max(1, final_step - warmup_steps)
    return peak * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * min(1.0, progress))))


@torch.inference_mode()
def evaluate(
    model: AtlasTransformer,
    data: torch.Tensor,
    *,
    context_length: int,
    batch_size: int,
    batches: int,
    device: str,
) -> float:
    model.eval()
    losses = []
    for _ in range(batches):
        inputs, targets = sample_batch(data, context_length, batch_size, device)
        _, loss = model(inputs, targets)
        losses.append(float(loss.item()))
    model.train()
    return sum(losses) / len(losses)


if __name__ == "__main__":
    main()
