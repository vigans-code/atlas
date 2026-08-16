# Atlas Native Model

This directory contains the first Atlas-owned language model. It does not download or load pretrained
weights. The tokenizer is deterministic Atlas code, the transformer is initialized from random values,
and checkpoints record `initialized_from: random` plus the exact verified corpus hash.

## Reality of the first checkpoint

The default model is intentionally small enough to train on the current 8 GB development computer.
It is an engineering checkpoint, not yet a broadly knowledgeable assistant. Quality grows by adding
properly licensed data to `data/manifest.json` and continuing Atlas's own training run.

## Train

```powershell
docker compose build model
docker compose run --rm model atlas-train --steps 2000
docker compose up -d model
```

Check readiness at `http://127.0.0.1:47636/v1/health`.

The Atlas desktop app also discovers `model/.venv` and `model/checkpoints/atlas-v0.pt` in a local
development checkout and starts this loopback service automatically. It never falls back to a remote
model when the native runtime is missing.

## Dataset provenance

Every training file must be stored beneath `data/`, declared in `data/manifest.json`, assigned an owner
and license, and pinned by SHA-256. Training refuses changed or undeclared sources. Do not add scraped,
private, copyrighted, or terms-restricted material without documented permission.

## Checkpoint policy

`load_checkpoint` accepts only the `atlas-scratch-v1` format with `initialized_from: random`. There is no
Hugging Face loader, external model downloader, or compatibility path for third-party weights.
