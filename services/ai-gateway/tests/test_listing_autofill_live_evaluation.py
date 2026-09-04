from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from mercasto_ai.combined import app


TOKEN = "listing-autofill-live-eval-token"
TAXONOMY = {
    "categories": {
        "motor": {"label": "Autos y motor"},
        "inmobiliaria": {"label": "Inmuebles"},
        "servicios": {"label": "Servicios"},
        "empleo": {"label": "Empleo"},
        "electronica": {"label": "Electrónica"},
    },
    "subcategories": {
        "motor": ["SUV", "Pickup", "Sedán", "Hatchback"],
        "inmobiliaria": ["Casas en venta", "Casas en renta", "Departamentos", "Terrenos"],
        "servicios": ["Plomería", "Electricidad", "Limpieza", "Mudanzas"],
        "empleo": ["Ventas", "Chofer", "Tecnología", "Medio tiempo"],
        "electronica": ["Smartphones", "Laptops", "TV y video", "Audio"],
    },
    "attributes": {
        "motor": {
            "marca": {"type": "select", "options": ["Nissan", "Toyota"]},
        },
        "electronica": {
            "marca": {"type": "select", "options": ["Samsung", "LG"]},
        },
    },
}

CASES = [
    ("Nissan Versa usado, sedán", "motor"),
    ("Casa de dos recámaras en venta", "inmobiliaria"),
    ("Servicio de plomería a domicilio", "servicios"),
    ("Vacante para chofer de tiempo completo", "empleo"),
    ("Televisor Samsung usado", "electronica"),
]


@pytest.mark.skipif(
    os.getenv("LISTING_AUTOFILL_LIVE_EVAL", "0") != "1",
    reason="requires explicit private Ollama evaluation runtime",
)
def test_private_model_representative_category_accuracy(monkeypatch) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", TOKEN)
    monkeypatch.setenv("LISTING_AUTOFILL_ENABLED", "1")
    client = TestClient(app)
    hits = 0

    for hint_text, expected_category in CASES:
        response = client.post(
            "/v1/autofill/listing",
            json={
                "hint_text": hint_text,
                "images_base64": [],
                "taxonomy": TAXONOMY,
            },
            headers={"X-Mercasto-Internal-Token": TOKEN},
        )
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["provider"] == "ollama"
        assert data["runtime"] == "private_local"
        assert data["rollout_mode"] == "suggestion_only"
        assert data["authoritative"] is False
        hits += int(data["proposal"].get("category", {}).get("value") == expected_category)

    assert hits / len(CASES) >= 0.80


@pytest.mark.skipif(
    os.getenv("LISTING_AUTOFILL_LIVE_EVAL", "0") != "1",
    reason="requires explicit private Ollama evaluation runtime",
)
def test_private_model_ambiguous_input_does_not_invent_restricted_claims(monkeypatch) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", TOKEN)
    monkeypatch.setenv("LISTING_AUTOFILL_ENABLED", "1")
    client = TestClient(app)
    response = client.post(
        "/v1/autofill/listing",
        json={
            "hint_text": "Objeto usado. No tengo más información.",
            "images_base64": [],
            "taxonomy": TAXONOMY,
        },
        headers={"X-Mercasto-Internal-Token": TOKEN},
    )

    assert response.status_code == 200, response.text
    data = response.json()
    rendered = str(data["proposal"]).lower()
    for forbidden in ("número de serie", "serial", "auténtico", "garantía incluida", "propiedad comprobada"):
        assert forbidden not in rendered
