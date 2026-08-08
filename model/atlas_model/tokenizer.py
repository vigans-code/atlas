class AtlasByteTokenizer:
    """A deterministic tokenizer owned by Atlas; it contains no imported vocabulary."""

    pad_id = 0
    bos_id = 1
    eos_id = 2
    separator_id = 3
    byte_offset = 4
    vocab_size = 260

    def encode(self, text: str, *, add_bos: bool = False, add_eos: bool = False) -> list[int]:
        if not isinstance(text, str):
            raise TypeError("Tokenizer input must be text.")
        tokens = [byte + self.byte_offset for byte in text.encode("utf-8")]
        if add_bos:
            tokens.insert(0, self.bos_id)
        if add_eos:
            tokens.append(self.eos_id)
        return tokens

    def decode(self, tokens: list[int]) -> str:
        values = bytearray()
        for token in tokens:
            if token < self.byte_offset:
                continue
            if token >= self.vocab_size:
                raise ValueError(f"Token {token} is outside the Atlas vocabulary.")
            values.append(token - self.byte_offset)
        return values.decode("utf-8", errors="replace")
