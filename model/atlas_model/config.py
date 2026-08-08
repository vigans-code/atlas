from dataclasses import asdict, dataclass


@dataclass(frozen=True, slots=True)
class AtlasModelConfig:
    vocab_size: int = 260
    context_length: int = 256
    d_model: int = 192
    n_heads: int = 6
    n_layers: int = 6
    d_ff: int = 512
    dropout: float = 0.0
    rope_base: float = 10_000.0

    def __post_init__(self) -> None:
        if self.vocab_size != 260:
            raise ValueError("Atlas byte tokenizer requires a vocabulary size of 260.")
        if self.context_length < 8:
            raise ValueError("Context length must be at least 8 tokens.")
        if self.d_model < 16 or self.d_model % self.n_heads:
            raise ValueError("Model width must be at least 16 and divisible by the head count.")
        if self.n_layers < 1 or self.d_ff < self.d_model:
            raise ValueError("Atlas model depth and feed-forward width are invalid.")
        if not 0 <= self.dropout < 1:
            raise ValueError("Dropout must be between zero and one.")

    def to_dict(self) -> dict[str, int | float]:
        return asdict(self)

    @classmethod
    def from_dict(cls, value: dict) -> "AtlasModelConfig":
        allowed = {field for field in cls.__dataclass_fields__}
        return cls(**{key: item for key, item in value.items() if key in allowed})
