import argparse
import hashlib
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
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.steps < 1 or args.batch_size < 1:
        raise ValueError("Training steps and batch size must be positive.")
    random.seed(args.seed)
    torch.manual_seed(args.seed)
    torch.set_num_threads(max(1, min(4, torch.get_num_threads())))

    corpus, sources = load_verified_corpus(args.manifest)
    corpus_hash = hashlib.sha256(corpus.encode("utf-8")).hexdigest()
    tokenizer = AtlasByteTokenizer()
    encoded = tokenizer.encode(corpus, add_bos=True, add_eos=True)
    config = AtlasModelConfig()
    if len(encoded) <= config.context_length + 1:
        repeats = (config.context_length * 4 // max(1, len(encoded))) + 2
        encoded *= repeats
    data = torch.tensor(encoded, dtype=torch.long)

    if args.resume:
        model, metadata = load_checkpoint(args.resume)
        start_step = int(metadata["step"])
    else:
        model = AtlasTransformer(config)
        start_step = 0
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=args.learning_rate,
        betas=(0.9, 0.95),
        weight_decay=0.1,
    )
    model.train()
    print(f"Atlas parameters: {model.parameter_count():,}")
    print(f"Verified corpus sources: {len(sources)}; bytes: {len(corpus.encode('utf-8')):,}")

    for step in range(start_step + 1, start_step + args.steps + 1):
        starts = torch.randint(0, len(data) - config.context_length - 1, (args.batch_size,))
        inputs = torch.stack([data[index : index + config.context_length] for index in starts])
        targets = torch.stack(
            [data[index + 1 : index + config.context_length + 1] for index in starts]
        )
        _, loss = model(inputs, targets)
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        if step == 1 or step % 25 == 0:
            print(f"step={step} loss={loss.item():.4f}")
        if step % args.save_every == 0:
            save_checkpoint(args.output, model, step=step, corpus_sha256=corpus_hash)

    save_checkpoint(args.output, model, step=start_step + args.steps, corpus_sha256=corpus_hash)
    print(f"Saved Atlas-only checkpoint: {args.output}")


if __name__ == "__main__":
    main()
