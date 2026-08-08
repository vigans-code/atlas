from atlas_model.tokenizer import AtlasByteTokenizer


def test_tokenizer_round_trips_multilingual_text() -> None:
    tokenizer = AtlasByteTokenizer()
    text = "Atlas writes code. Përshëndetje! 🌍"
    tokens = tokenizer.encode(text, add_bos=True, add_eos=True)
    assert tokenizer.decode(tokens) == text
    assert max(tokens) < tokenizer.vocab_size
