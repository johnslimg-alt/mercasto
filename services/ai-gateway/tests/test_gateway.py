from __future__ import annotations

import base64

import pytest
from fastapi.testclient import TestClient

from mercasto_ai.contracts import ModelVerdict, normalize_verdict
from mercasto_ai.main import app, get_ollama_client
from mercasto_ai.ollama import OllamaUnavailable


class FakeOllamaClient:
    def __init__(self, verdict: ModelVerdict) -> None:
        self.verdict = verdict
        self.calls: list[tuple[str, str]] = []

    async def moderate(self, context: str, image_base64: str) -> ModelVerdict:
        self.calls.append((context, image_base64))
        return self.verdict


class FailingOllamaClient:
    async def moderate(self, context: str, image_base64: str) -> ModelVerdict:
        raise OllamaUnavailable("synthetic local dependency outage")


@pytest.fixture(autouse=True)
def clean_dependency_overrides() -> None:
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def encoded_image() -> str:
    return base64.b64encode(b"fake-image-payload-for-contract-test").decode()


def test_normalize_verdict_matches_php_fail_closed_threshold() -> None:
    approved = normalize_verdict(
        ModelVerdict(
            decision="approved",
            reason="Apropiada.",
            confidence=0.97,
            flags=[],
        )
    )
    assert approved.approved is True
    assert approved.decision == "approved"

    low_confidence = normalize_verdict(
        ModelVerdict(
            decision="approved",
            reason="Duda material.",
            confidence=0.89,
            flags=[],
        )
    )
    assert low_confidence.approved is False
    assert low_confidence.decision == "manual_review"

    rejected = normalize_verdict(
        ModelVerdict(
            decision="rejected",
            reason="Contenido prohibido.",
            confidence=0.99,
            flags=["prohibited"],
        )
    )
    assert rejected.approved is False
    assert rejected.decision == "rejected"


def test_gateway_requires_internal_service_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "contract-secret")
    client = TestClient(app)

    response = client.post(
        "/v1/moderation/image",
        json={"context": "avatar público", "image_base64": encoded_image()},
    )

    assert response.status_code == 401


def test_gateway_returns_503_when_internal_auth_is_not_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("MERCASTO_AI_INTERNAL_TOKEN", raising=False)
    client = TestClient(app)

    response = client.post(
        "/v1/moderation/image",
        headers={"X-Mercasto-Internal-Token": "anything"},
        json={"context": "avatar público", "image_base64": encoded_image()},
    )

    assert response.status_code == 503


def test_gateway_passes_only_authenticated_valid_payload_to_local_ai(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "contract-secret")
    fake = FakeOllamaClient(
        ModelVerdict(
            decision="approved",
            reason="Retrato apropiado.",
            confidence=0.98,
            flags=[],
        )
    )
    app.dependency_overrides[get_ollama_client] = lambda: fake
    client = TestClient(app)
    image = encoded_image()

    response = client.post(
        "/v1/moderation/image",
        headers={"X-Mercasto-Internal-Token": "contract-secret"},
        json={"context": "avatar público", "image_base64": image},
    )

    assert response.status_code == 200
    assert response.json()["approved"] is True
    assert response.json()["decision"] == "approved"
    assert fake.calls == [("avatar público", image)]


def test_gateway_fails_closed_when_local_ollama_is_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "contract-secret")
    app.dependency_overrides[get_ollama_client] = FailingOllamaClient
    client = TestClient(app)

    response = client.post(
        "/v1/moderation/image",
        headers={"X-Mercasto-Internal-Token": "contract-secret"},
        json={"context": "avatar público", "image_base64": encoded_image()},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Local AI moderation is unavailable."


def test_gateway_rejects_invalid_base64_before_local_ai(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "contract-secret")
    fake = FakeOllamaClient(
        ModelVerdict(decision="approved", reason="unused", confidence=0.99, flags=[])
    )
    app.dependency_overrides[get_ollama_client] = lambda: fake
    client = TestClient(app)

    response = client.post(
        "/v1/moderation/image",
        headers={"X-Mercasto-Internal-Token": "contract-secret"},
        json={"context": "avatar público", "image_base64": "this-is-not-base64!!!"},
    )

    assert response.status_code == 422
    assert fake.calls == []


def test_health_requires_internal_credential_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MERCASTO_AI_INTERNAL_TOKEN", raising=False)
    response = TestClient(app).get("/health")
    assert response.status_code == 503


def test_health_is_ready_when_internal_credential_is_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "contract-secret")
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
