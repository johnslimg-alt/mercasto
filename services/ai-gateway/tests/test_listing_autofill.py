from __future__ import annotations

from fastapi.testclient import TestClient

from mercasto_ai.autofill import _canonicalize, AutofillField, ListingAutofillProposal
from mercasto_ai.combined import app


TOKEN = "autofill-test-token"


def taxonomy() -> dict:
    return {
        "categories": {
            "motor": {"label": "Autos y motor"},
            "servicios": {"label": "Servicios"},
        },
        "subcategories": {
            "motor": ["SUV", "Pickup"],
            "servicios": ["Plomería", "Electricidad"],
        },
        "attributes": {
            "motor": {
                "marca": {"type": "select", "options": ["Toyota", "Nissan"]},
                "modelo": {"type": "text", "options": []},
            }
        },
    }


def payload() -> dict:
    return {
        "hint_text": "SUV Toyota usado",
        "images_base64": [],
        "taxonomy": taxonomy(),
    }


def test_autofill_endpoint_authenticates_before_route_processing(monkeypatch) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", TOKEN)
    monkeypatch.setenv("LISTING_AUTOFILL_ENABLED", "1")
    client = TestClient(app)

    response = client.post("/v1/autofill/listing", json=payload())

    assert response.status_code == 401


def test_autofill_endpoint_rejects_oversized_body_before_model(monkeypatch) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", TOKEN)
    monkeypatch.setenv("LISTING_AUTOFILL_ENABLED", "1")
    client = TestClient(app)

    response = client.post(
        "/v1/autofill/listing",
        content=b"{" + (b" " * (4 * 1024 * 1024 + 1)) + b"}",
        headers={
            "X-Mercasto-Internal-Token": TOKEN,
            "Content-Type": "application/json",
        },
    )

    assert response.status_code == 413


def test_autofill_kill_switch_fails_closed_to_unavailable(monkeypatch) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", TOKEN)
    monkeypatch.setenv("LISTING_AUTOFILL_ENABLED", "0")
    client = TestClient(app)

    response = client.post(
        "/v1/autofill/listing",
        json=payload(),
        headers={"X-Mercasto-Internal-Token": TOKEN},
    )

    assert response.status_code == 503


def test_text_only_autofill_returns_private_suggestion_contract(monkeypatch) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", TOKEN)
    monkeypatch.setenv("LISTING_AUTOFILL_ENABLED", "1")

    async def fake_call(_request):
        return (
            ListingAutofillProposal(
                category=AutofillField(value="motor", confidence=0.95),
                subcategory=AutofillField(value="SUV", confidence=0.91),
                attributes={
                    "marca": AutofillField(value="Toyota", confidence=0.88),
                },
                title=AutofillField(value="Toyota SUV usado", confidence=0.82),
            ),
            "qwen3-vl:test",
        )

    monkeypatch.setattr("mercasto_ai.autofill._call_ollama", fake_call)
    client = TestClient(app)
    response = client.post(
        "/v1/autofill/listing",
        json=payload(),
        headers={"X-Mercasto-Internal-Token": TOKEN},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["runtime"] == "private_local"
    assert data["provider"] == "ollama"
    assert data["rollout_mode"] == "suggestion_only"
    assert data["authoritative"] is False
    assert data["model"] == "qwen3-vl:test"
    assert data["proposal"]["category"]["value"] == "motor"


def test_canonicalizer_drops_hallucinated_taxonomy_values() -> None:
    from mercasto_ai.autofill import AutofillTaxonomy

    schema = AutofillTaxonomy.model_validate(taxonomy())
    proposal = ListingAutofillProposal(
        category=AutofillField(value="motor", confidence=0.99),
        subcategory=AutofillField(value="Flying cars", confidence=0.99),
        attributes={
            "marca": AutofillField(value="ImaginaryBrand", confidence=0.99),
            "serial_number": AutofillField(value="123456", confidence=0.99),
            "modelo": AutofillField(value="RAV4", confidence=0.90),
        },
    )

    canonical, warnings = _canonicalize(proposal, schema)

    assert canonical.category is not None
    assert canonical.category.value == "motor"
    assert canonical.subcategory is None
    assert canonical.attributes == {"modelo": AutofillField(value="RAV4", confidence=0.90)}
    assert "invalid_subcategory_dropped" in warnings
    assert "invalid_attribute_enum_dropped" in warnings
    assert "invalid_attribute_key_dropped" in warnings


def test_prompt_contract_forbids_sensitive_and_ownership_inference() -> None:
    from mercasto_ai.autofill import _SYSTEM_PROMPT

    prompt = _SYSTEM_PROMPT.lower()
    for marker in (
        "atributos sensibles",
        "propiedad",
        "autenticidad",
        "garantía",
        "ubicación exif",
        "no adivines",
        "taxonomy",
    ):
        assert marker in prompt
