import hashlib
import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class CorpusSource:
    source_id: str
    path: Path
    license: str
    owner: str
    sha256: str


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_verified_corpus(manifest_path: Path) -> tuple[str, list[CorpusSource]]:
    manifest_path = manifest_path.resolve()
    data_root = manifest_path.parent
    value = json.loads(manifest_path.read_text(encoding="utf-8"))
    if value.get("schema_version") != 1 or not isinstance(value.get("sources"), list):
        raise ValueError("Atlas corpus manifest is invalid.")

    sources: list[CorpusSource] = []
    texts: list[str] = []
    for item in value["sources"]:
        relative = Path(str(item.get("path", "")))
        source_path = (data_root / relative).resolve()
        if data_root not in source_path.parents or not source_path.is_file():
            raise ValueError("Corpus source must be a file inside the Atlas data directory.")
        expected = str(item.get("sha256", "")).lower()
        actual = sha256_file(source_path)
        if len(expected) != 64 or actual != expected:
            raise ValueError(f"Corpus integrity check failed for {relative}.")
        license_name = str(item.get("license", "")).strip()
        owner = str(item.get("owner", "")).strip()
        source_id = str(item.get("id", "")).strip()
        if not source_id or not license_name or not owner:
            raise ValueError("Every corpus source requires an id, owner, and license.")
        sources.append(CorpusSource(source_id, source_path, license_name, owner, actual))
        texts.append(source_path.read_text(encoding="utf-8"))

    if not texts:
        raise ValueError("Atlas needs at least one verified corpus source.")
    return "\n\n<ATLAS_SOURCE_BOUNDARY>\n\n".join(texts), sources
