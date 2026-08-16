import argparse
import json
from pathlib import Path

import torch

from atlas_model.checkpoint import load_checkpoint
from atlas_model.tokenizer import AtlasByteTokenizer

PROMPTS = (
    "hey",
    "who are you",
    "what can you do",
    "what is OSINT",
    "what is Python",
    "explain authentication",
    "can you write code",
    "how should passwords be stored",
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate an Atlas-owned checkpoint.")
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument("--tokens", type=int, default=120)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    model, metadata = load_checkpoint(args.checkpoint)
    tokenizer = AtlasByteTokenizer()
    results = []
    for prompt in PROMPTS:
        encoded = tokenizer.encode(f"User: {prompt}\nAtlas:", add_bos=True)
        tokens = torch.tensor([encoded], dtype=torch.long)
        generated = model.generate(
            tokens,
            max_new_tokens=max(1, min(args.tokens, 256)),
            temperature=0.2,
            top_k=1,
        )
        response = tokenizer.decode(generated[0, len(encoded) :].tolist()).strip()
        response = response.split("\nUser:", 1)[0].split("\nAtlas:", 1)[0].strip()
        results.append({"prompt": prompt, "response": response})
        print(f"User: {prompt}\nAtlas: {response}\n")
    report = {
        "checkpoint": str(args.checkpoint),
        "step": metadata["step"],
        "corpus_sha256": metadata["corpus_sha256"],
        "validation_loss": metadata.get("validation_loss"),
        "results": results,
    }
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
