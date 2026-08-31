from __future__ import annotations

import base64

import pytest
from fastapi.testclient import TestClient

from mercasto_ai.contracts import ModelVerdict
from mercasto_ai.main import _MAX_LISTING_REQUEST_BODY_BYTES, app, get_ollama_client
from mercasto_ai.ollama import estimate_listing_context_tokens

CANONICAL_SIGNALS = ["weapon", "sexual_exploitation", "controlled_drug", "fraud"]


class FakeListingOllamaClient:
    model = "synthetic-qwen-vl"

    def __init__(self, verdict: ModelVerdict) -> None:
        self.verdict = verdict
        self.calls: list[tuple[str, str, dict[str, str], list[str], list[str]]] = []

    async def moderate_listing(
        self,
        title: str,
        description: str,
        structured_context: dict[str, str],
        images_base64: list[str],
        policy_signals: list[str],
    ) -> ModelVerdict:
        self.calls.append((title, description, structured_context, images_base64, policy_signals))
        return self.verdict


@pytest.fixture(autouse=True)
def clean_dependency_overrides() -> None:
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def encoded_image(label: str = "fixture") -> str:
    return base64.b64encode(f"synthetic-image-{label}".encode()).decode()


def listing_payload(**overrides: object) -> dict[str, object]:
    title = overrides.pop("title", "Artículo de prueba")
    description = overrides.pop(
        "description", "Descripción sintética para contrato de moderación."
    )
    images = overrides.pop("images_base64", [])
    payload: dict[str, object] = {
        "title": title,
        "description": description,
        "source_description_chars": len(description) if isinstance(description, str) else 0,
        "structured_context": {
            "category": "autos",
            "subcategory": "sedanes",
            "price": "125000",
            "location": "Veracruz, Veracruz",
            "state": "Veracruz",
            "city": "Veracruz",
            "condition": "usado",
            "attributes_json": '{"transmission":"automatic"}',
        },
        "images_base64": images,
        "source_image_count": len(images) if isinstance(images, list) else 0,
        "policy_signals": CANONICAL_SIGNALS,
    }
    payload.update(overrides)
    return payload


def authenticated_client(
    monkeypatch: pytest.MonkeyPatch,
    verdict: ModelVerdict,
) -> tuple[TestClient, FakeListingOllamaClient]:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "contract-secret")
    fake = FakeListingOllamaClient(verdict)
    app.dependency_overrides[get_ollama_client] = lambda: fake
    return TestClient(app), fake


def auth_headers() -> dict[str, str]:
    return {"X-Mercasto-Internal-Token": "contract-secret"}


def test_listing_gateway_requires_internal_service_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "contract-secret")
    client = TestClient(app)

    response = client.post("/v1/moderation/listing", json=listing_payload())

    assert response.status_code == 401


def test_listing_gateway_authenticates_before_json_parsing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "contract-secret")
    client = TestClient(app)

    response = client.post(
        "/v1/moderation/listing",
        content=b"not-json",
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 401


def test_listing_gateway_rejects_declared_oversized_body_before_json_parsing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "contract-secret")
    client = TestClient(app)

    response = client.post(
        "/v1/moderation/listing",
        content=b"not-json",
        headers={
            **auth_headers(),
            "Content-Type": "application/json",
            "Content-Length": str(_MAX_LISTING_REQUEST_BODY_BYTES + 1),
        },
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "Listing moderation request body is too large."


def test_listing_gateway_preserves_bounded_visual_input_for_local_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, fake = authenticated_client(
        monkeypatch,
        ModelVerdict(
            decision="approved",
            reason="Sin señales de riesgo en la prueba.",
            confidence=0.97,
            flags=["weapon", "invented_model_category"],
        ),
    )
    images = [encoded_image("front"), encoded_image("back")]

    response = client.post(
        "/v1/moderation/listing",
        headers=auth_headers(),
        json=listing_payload(
            title="Producto permitido",
            description="Texto del anuncio.",
            images_base64=images,
            policy_signals=["weapon", "fraud", "weapon"],
        ),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["decision"] == "approved"
    assert body["approved"] is True
    assert body["flags"] == ["weapon"]
    assert body["provider"] == "ollama"
    assert body["model"] == "synthetic-qwen-vl"
    assert body["runtime"] == "private_local"
    assert body["gateway_version"] == "0.2.0"
    assert body["rollout_mode"] == "shadow_assist"
    assert body["authoritative"] is False
    assert body["description_truncated"] is False
    assert body["input_description_chars"] == len("Texto del anuncio.")
    assert body["model_description_chars"] == len("Texto del anuncio.")
    assert body["input_image_count"] == 2
    assert body["model_image_count"] == 2
    assert body["images_omitted"] == 0
    assert body["input_policy_signal_count"] == 2
    assert body["model_policy_signal_count"] == 2
    assert body["policy_signals_omitted"] == 0
    assert body["model_context_tokens"] == 8192
    assert isinstance(body["latency_ms"], int)
    assert len(fake.calls) == 1
    assert fake.calls[0][0] == "Producto permitido"
    assert fake.calls[0][1] == "Texto del anuncio."
    assert fake.calls[0][2]["category"] == "autos"
    assert fake.calls[0][3] == images
    assert fake.calls[0][4] == ["weapon", "fraud"]


@pytest.mark.parametrize(
    ("fixture_name", "verdict", "expected_decision", "expected_flags"),
    [
        (
            "allowed",
            ModelVerdict(
                decision="approved",
                reason="Fixture permitido.",
                confidence=0.98,
                flags=[],
            ),
            "approved",
            [],
        ),
        (
            "weapons",
            ModelVerdict(
                decision="rejected",
                reason="Señal sintética de arma.",
                confidence=0.99,
                flags=["weapon"],
            ),
            "rejected",
            ["weapon"],
        ),
        (
            "explicit-adult",
            ModelVerdict(
                decision="manual_review",
                reason="Señal sintética de contenido explícito.",
                confidence=0.88,
                flags=["sexual_exploitation"],
            ),
            "manual_review",
            ["sexual_exploitation"],
        ),
        (
            "controlled-product",
            ModelVerdict(
                decision="rejected",
                reason="Señal sintética de producto controlado.",
                confidence=0.96,
                flags=["controlled_drug"],
            ),
            "rejected",
            ["controlled_drug"],
        ),
        (
            "fraud-like",
            ModelVerdict(
                decision="manual_review",
                reason="Señal sintética de fraude.",
                confidence=0.86,
                flags=["fraud"],
            ),
            "manual_review",
            ["fraud"],
        ),
    ],
)
def test_listing_contract_covers_required_synthetic_fixture_classes(
    monkeypatch: pytest.MonkeyPatch,
    fixture_name: str,
    verdict: ModelVerdict,
    expected_decision: str,
    expected_flags: list[str],
) -> None:
    client, _fake = authenticated_client(monkeypatch, verdict)

    response = client.post(
        "/v1/moderation/listing",
        headers=auth_headers(),
        json=listing_payload(title=f"Fixture {fixture_name}"),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["decision"] == expected_decision
    assert body["flags"] == expected_flags
    assert body["authoritative"] is False


@pytest.mark.parametrize(
    ("decision", "confidence", "expected"),
    [
        ("approved", 0.85, "approved"),
        ("approved", 0.84, "manual_review"),
        ("rejected", 0.90, "rejected"),
        ("rejected", 0.89, "manual_review"),
        ("manual_review", 0.99, "manual_review"),
    ],
)
def test_listing_gateway_matches_authoritative_listing_confidence_thresholds(
    monkeypatch: pytest.MonkeyPatch,
    decision: str,
    confidence: float,
    expected: str,
) -> None:
    client, _fake = authenticated_client(
        monkeypatch,
        ModelVerdict(decision=decision, reason="threshold fixture", confidence=confidence, flags=[]),
    )

    response = client.post(
        "/v1/moderation/listing",
        headers=auth_headers(),
        json=listing_payload(images_base64=[]),
    )

    assert response.status_code == 200
    assert response.json()["decision"] == expected


def test_listing_gateway_accepts_text_only_shadow_request(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, fake = authenticated_client(
        monkeypatch,
        ModelVerdict(
            decision="manual_review",
            reason="Texto requiere revisión.",
            confidence=0.72,
            flags=["fraud"],
        ),
    )

    response = client.post(
        "/v1/moderation/listing",
        headers=auth_headers(),
        json=listing_payload(images_base64=[]),
    )

    assert response.status_code == 200
    assert response.json()["input_image_count"] == 0
    assert response.json()["model_image_count"] == 0
    assert fake.calls[0][3] == []


def test_listing_gateway_represents_full_listing_with_bounded_preprocessed_model_input(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, fake = authenticated_client(
        monkeypatch,
        ModelVerdict(
            decision="approved",
            reason="Fixture máximo aparentemente permitido.",
            confidence=0.99,
            flags=[],
        ),
    )
    title = "T" * 255
    description = "D" * 12_000
    images = [encoded_image("front"), encoded_image("back")]

    response = client.post(
        "/v1/moderation/listing",
        headers=auth_headers(),
        json=listing_payload(
            title=title,
            description=description,
            source_description_chars=5_000_000,
            images_base64=images,
            source_image_count=10,
        ),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["decision"] == "manual_review"
    assert body["approved"] is False
    assert body["description_truncated"] is True
    assert body["input_description_chars"] == 5_000_000
    assert 0 <= body["model_description_chars"] < 6_000
    assert body["input_image_count"] == 10
    assert 1 <= body["model_image_count"] <= 2
    assert body["images_omitted"] == 10 - body["model_image_count"]
    assert fake.calls[0][0] == title
    assert fake.calls[0][1] == description[: body["model_description_chars"]]
    assert fake.calls[0][3] == images[: body["model_image_count"]]
    assert estimate_listing_context_tokens(*fake.calls[0]) <= body["model_context_tokens"]


def test_listing_gateway_bounds_policy_vocabulary_and_reports_omissions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, fake = authenticated_client(
        monkeypatch,
        ModelVerdict(decision="approved", reason="policy fixture", confidence=0.99, flags=[]),
    )
    signals = [f"signal_{index:03d}_{'x' * 60}" for index in range(80)]

    response = client.post(
        "/v1/moderation/listing",
        headers=auth_headers(),
        json=listing_payload(images_base64=[], policy_signals=signals),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["decision"] == "manual_review"
    assert body["input_policy_signal_count"] == 80
    assert 0 < body["model_policy_signal_count"] < 80
    assert body["policy_signals_omitted"] == 80 - body["model_policy_signal_count"]
    assert fake.calls[0][4] == signals[: body["model_policy_signal_count"]]


def test_listing_gateway_rejects_title_beyond_authoritative_limit_before_model_call(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, fake = authenticated_client(
        monkeypatch,
        ModelVerdict(decision="approved", reason="unused", confidence=0.99, flags=[]),
    )

    response = client.post(
        "/v1/moderation/listing",
        headers=auth_headers(),
        json=listing_payload(title="T" * 256),
    )

    assert response.status_code == 422
    assert fake.calls == []


def test_listing_gateway_rejects_more_than_two_preprocessed_images_before_model_call(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, fake = authenticated_client(
        monkeypatch,
        ModelVerdict(decision="approved", reason="unused", confidence=0.99, flags=[]),
    )

    response = client.post(
        "/v1/moderation/listing",
        headers=auth_headers(),
        json=listing_payload(
            images_base64=[encoded_image("one"), encoded_image("two"), encoded_image("three")],
            source_image_count=3,
        ),
    )

    assert response.status_code == 422
    assert fake.calls == []


def test_listing_gateway_rejects_noncanonical_signal_shape_before_model_call(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, fake = authenticated_client(
        monkeypatch,
        ModelVerdict(decision="approved", reason="unused", confidence=0.99, flags=[]),
    )

    response = client.post(
        "/v1/moderation/listing",
        headers=auth_headers(),
        json=listing_payload(policy_signals=["weapon", "Invented Category!"]),
    )

    assert response.status_code == 422
    assert fake.calls == []


def test_listing_gateway_forces_high_token_input_inside_model_context_budget(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, fake = authenticated_client(
        monkeypatch,
        ModelVerdict(decision="approved", reason="high-token fixture", confidence=0.99, flags=[]),
    )
    description = "🧨" * 6_000
    signals = [f"signal_{index:03d}_{'x' * 40}" for index in range(40)]

    response = client.post(
        "/v1/moderation/listing",
        headers=auth_headers(),
        json=listing_payload(description=description, policy_signals=signals),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["decision"] == "manual_review"
    assert body["approved"] is False
    assert body["description_truncated"] or body["policy_signals_omitted"] > 0 or body["images_omitted"] > 0
    assert fake.calls
    assert estimate_listing_context_tokens(*fake.calls[0]) <= body["model_context_tokens"]


def test_listing_gateway_requires_explicit_source_provenance(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, fake = authenticated_client(
        monkeypatch,
        ModelVerdict(decision="approved", reason="unused", confidence=0.99, flags=[]),
    )
    payload = listing_payload()
    payload.pop("source_description_chars")
    payload.pop("source_image_count")

    response = client.post(
        "/v1/moderation/listing",
        headers=auth_headers(),
        json=payload,
    )

    assert response.status_code == 422
    assert fake.calls == []


def test_listing_context_estimator_keeps_preprocessed_visual_input_inside_budget() -> None:
    assert (
        estimate_listing_context_tokens(
            "fixture",
            "safe",
            {"category": "autos", "attributes_json": "{}"},
            [encoded_image("visual")],
            ["fraud"],
        )
        < 8192
    )
