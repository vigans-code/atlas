from pathlib import Path
from typing import Any

import torch

from atlas_model.config import AtlasModelConfig
from atlas_model.network import AtlasTransformer


def save_checkpoint(
    path: Path,
    model: AtlasTransformer,
    *,
    step: int,
    corpus_sha256: str,
    training_state: dict[str, Any] | None = None,
    validation_loss: float | None = None,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_suffix(f"{path.suffix}.tmp")
    torch.save(
        {
            "format": AtlasTransformer.checkpoint_format,
            "initialized_from": "random",
            "config": model.config.to_dict(),
            "model": model.state_dict(),
            "step": int(step),
            "corpus_sha256": corpus_sha256,
            "validation_loss": validation_loss,
            **({"training_state": training_state} if training_state is not None else {}),
        },
        temporary_path,
    )
    temporary_path.replace(path)


def load_checkpoint(path: Path, device: str = "cpu") -> tuple[AtlasTransformer, dict]:
    value = torch.load(path, map_location=device, weights_only=True)
    valid_format = value.get("format") == AtlasTransformer.checkpoint_format
    random_origin = value.get("initialized_from") == "random"
    if not valid_format or not random_origin:
        raise ValueError("Checkpoint is not an Atlas from-scratch model.")
    model = AtlasTransformer(AtlasModelConfig.from_dict(value["config"]))
    model.load_state_dict(value["model"], strict=True)
    model.to(device)
    metadata = {
        key: value.get(key)
        for key in (
            "step",
            "corpus_sha256",
            "initialized_from",
            "validation_loss",
            "training_state",
        )
    }
    return model, metadata
