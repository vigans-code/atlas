import asyncio
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from atlas_model.checkpoint import load_checkpoint
from atlas_model.tokenizer import AtlasByteTokenizer


class Message(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=32_000)


class ChatRequest(BaseModel):
    messages: list[Message] = Field(min_length=1, max_length=40)
    max_new_tokens: int = Field(default=256, ge=1, le=512)
    temperature: float = Field(default=0.8, ge=0.05, le=2.0)
    top_k: int = Field(default=1, ge=1, le=100)


checkpoint_path = Path(os.environ.get("ATLAS_MODEL_CHECKPOINT", "checkpoints/atlas-v0.pt"))
tokenizer = AtlasByteTokenizer()
model = None
metadata = None
generation_lock = asyncio.Lock()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    global model, metadata
    if checkpoint_path.is_file():
        model, metadata = load_checkpoint(checkpoint_path)
    yield


app = FastAPI(
    title="Atlas Native Model",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)


@app.get("/v1/health")
async def health() -> dict:
    return {
        "status": "ready" if model is not None else "checkpoint-required",
        "model": "atlas-native-v1",
        "initialized_from": metadata.get("initialized_from") if metadata else "random",
        "checkpoint": str(checkpoint_path),
    }


@app.post("/v1/chat")
async def chat(request: ChatRequest) -> dict[str, str]:
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Train the first Atlas checkpoint before chatting.",
        )
    transcript = "\n".join(f"{item.role.title()}: {item.content}" for item in request.messages[-8:])
    prompt = f"{transcript}\nAtlas:"
    encoded = tokenizer.encode(prompt, add_bos=True)[-model.config.context_length :]
    tokens = torch.tensor([encoded], dtype=torch.long)
    async with generation_lock:
        generated = await asyncio.to_thread(
            model.generate,
            tokens,
            request.max_new_tokens,
            request.temperature,
            request.top_k,
            (tuple(tokenizer.encode("\nUser:")),),
        )
    text = tokenizer.decode(generated[0, len(encoded) :].tolist()).strip()
    for marker in ("\nUser:", "\nAtlas:", "<ATLAS_SOURCE_BOUNDARY>"):
        text = text.split(marker, 1)[0].strip()
    return {"content": text, "model": "atlas-native-v1"}
