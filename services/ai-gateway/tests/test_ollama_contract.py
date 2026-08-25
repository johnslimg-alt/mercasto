from __future__ import annotations

from pathlib import Path


def test_python_ollama_payload_matches_php_public_image_budget() -> None:
    source = Path(__file__).parents[1] / "mercasto_ai" / "ollama.py"
    text = source.read_text()

    assert '"temperature": 0.1' in text
    assert '"num_predict": 220' in text
    assert '"num_ctx": 3072' in text
    assert '"keep_alive": "24h"' in text


def test_listing_ollama_payload_has_explicit_larger_context_budget() -> None:
    source = Path(__file__).parents[1] / "mercasto_ai" / "ollama.py"
    text = source.read_text()

    assert "_LISTING_NUM_CTX = 8192" in text
    assert '"num_predict": 320' in text
    assert '"num_ctx": _LISTING_NUM_CTX' in text
