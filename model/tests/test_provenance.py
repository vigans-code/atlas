import hashlib
import json
from pathlib import Path

import pytest

from atlas_model.provenance import load_verified_corpus


def test_corpus_requires_matching_hash_and_license(tmp_path: Path) -> None:
    source = tmp_path / "owned.txt"
    source.write_text("Original Atlas material", encoding="utf-8")
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    manifest = tmp_path / "manifest.json"
    manifest.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "sources": [
                    {
                        "id": "owned",
                        "path": "owned.txt",
                        "owner": "Atlas",
                        "license": "Original",
                        "sha256": digest,
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    corpus, sources = load_verified_corpus(manifest)
    assert corpus == "Original Atlas material"
    assert sources[0].sha256 == digest
    source.write_text("Tampered", encoding="utf-8")
    with pytest.raises(ValueError, match="integrity"):
        load_verified_corpus(manifest)
