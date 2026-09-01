from __future__ import annotations

from fastapi.testclient import TestClient
import pytest

from mercasto_ai.contracts import ModelVerdict
from mercasto_ai.main import app, get_ollama_client
import mercasto_ai.main as gateway_main


class FakeClient:
    model = "synthetic-qwen-vl"

    def __init__(self) -> None:
        self.calls = 0

    async def moderate_listing(self, *args: object) -> ModelVerdict:
        self.calls += 1
        return ModelVerdict(
            decision="manual_review",
            reason="fixture",
            confidence=0.5,
            flags=[],
        )


def payload(source_image_count: int = 0) -> dict[str, object]:
    return {
        "title": "Fixture",
        "description": "Safe synthetic listing",
        "source_description_chars": 22,
        "structured_context": {"category": "general", "attributes_json": "{}"},
        "images_base64": [],
        "source_image_count": source_image_count,
        "policy_signals": ["fraud"],
    }


def client(monkeypatch: pytest.MonkeyPatch, fake: FakeClient) -> TestClient:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "contract-secret")
    app.dependency_overrides[get_ollama_client] = lambda: fake
    return TestClient(app)


def headers() -> dict[str, str]:
    return {"X-Mercasto-Internal-Token": "contract-secret"}


def test_listing_gateway_marks_context_skip_without_model_identity(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake = FakeClient()
    http = client(monkeypatch, fake)
    monkeypatch.setattr(
        gateway_main,
        "_fit_listing_model_input",
        lambda *args: ("", [], ["fraud"], False),
    )

    response = http.post("/v1/moderation/listing", headers=headers(), json=payload())

    assert response.status_code == 200
    body = response.json()
    assert body["decision"] == "manual_review"
    assert body["model_executed"] is False
    assert body["provider"] == "none"
    assert body["model"] is None
    assert body["runtime"] == "skipped"
    assert body["latency_ms"] == 0
    assert fake.calls == 0
    app.dependency_overrides.clear()


def test_listing_gateway_preserves_thirteen_source_media_items(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake = FakeClient()
    http = client(monkeypatch, fake)

    response = http.post(
        "/v1/moderation/listing",
        headers=headers(),
        json=payload(source_image_count=13),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["input_image_count"] == 13
    assert body["images_omitted"] == 13
    assert body["model_executed"] is True
    assert fake.calls == 1
    app.dependency_overrides.clear()
