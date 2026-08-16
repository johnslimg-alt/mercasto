from __future__ import annotations

from pathlib import Path


def test_python_ollama_payload_matches_php_public_image_budget() -> None:
    source = Path(__file__).parents[1] / "mercasto_ai" / "ollama.py"
    text = source.read_text()

    assert '"temperature": 0.1' in text
    assert '"num_predict": 220' in text
    assert '"num_ctx": 3072' in text
    assert '"keep_alive": "24h"' in text
