import torch

from atlas_model.config import AtlasModelConfig
from atlas_model.network import AtlasTransformer


def test_random_atlas_model_trains_and_generates() -> None:
    torch.manual_seed(7)
    config = AtlasModelConfig(context_length=16, d_model=32, n_heads=4, n_layers=2, d_ff=64)
    model = AtlasTransformer(config)
    inputs = torch.randint(0, config.vocab_size, (2, 16))
    logits, loss = model(inputs, inputs)
    assert logits.shape == (2, 16, config.vocab_size)
    assert loss.isfinite()
    generated = model.generate(inputs[:1, :4], max_new_tokens=3, top_k=5)
    assert generated.shape == (1, 7)
    assert model.parameter_count() > 0
