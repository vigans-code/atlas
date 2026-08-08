import argparse
from pathlib import Path

import torch

from atlas_model.checkpoint import load_checkpoint
from atlas_model.tokenizer import AtlasByteTokenizer


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate text with an Atlas-native checkpoint.")
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument("prompt")
    parser.add_argument("--tokens", type=int, default=160)
    args = parser.parse_args()
    model, metadata = load_checkpoint(args.checkpoint)
    tokenizer = AtlasByteTokenizer()
    prompt = f"User: {args.prompt.strip()}\nAtlas:"
    encoded = tokenizer.encode(prompt, add_bos=True)
    tokens = torch.tensor([encoded], dtype=torch.long)
    generated = model.generate(tokens, max_new_tokens=max(1, min(args.tokens, 512)))
    print(tokenizer.decode(generated[0, len(encoded) :].tolist()).strip())
    print(f"\n[Atlas checkpoint step {metadata['step']}; initialized from random weights]")


if __name__ == "__main__":
    main()
