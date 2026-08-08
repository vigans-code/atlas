from pathlib import Path

import torch

from atlas_model.config import AtlasModelConfig
from atlas_model.network import AtlasTransformer


def save_checkpoint(path: Path, model: AtlasTransformer, *, step: int, corpus_sha256: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "format": AtlasTransformer.checkpoint_format,
            "initialized_from": "random",
            "config": model.config.to_dict(),
            "model": model.state_dict(),
            "step": int(step),
            "corpus_sha256": corpus_sha256,
        },
        path,
    )


def load_checkpoint(path: Path, device: str = "cpu") -> tuple[AtlasTransformer, dict]:
    value = torch.load(path, map_location=device, weights_only=True)
    valid_format = value.get("format") == AtlasTransformer.checkpoint_format
    random_origin = value.get("initialized_from") == "random"
    if not valid_format or not random_origin:
        raise ValueError("Checkpoint is not an Atlas from-scratch model.")
    model = AtlasTransformer(AtlasModelConfig.from_dict(value["config"]))
    model.load_state_dict(value["model"], strict=True)
    model.to(device)
    return model, {key: value[key] for key in ("step", "corpus_sha256", "initialized_from")}
