from tools.build_corpus import DIALOGUES, build


def test_owned_corpus_contains_dialogues_and_project_sources() -> None:
    corpus, included = build()

    assert len(DIALOGUES) >= 40
    assert "User: hey\nAtlas: Hey! What can I help you with?" in corpus
    assert "docs/knowledge-rag-architecture.md" in included
    assert "model/atlas_model/network.py" in included
    assert "node_modules" not in corpus
