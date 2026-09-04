from __future__ import annotations

import base64
import io

from fastapi.testclient import TestClient
from PIL import Image

from mercasto_ai.autofill import AutofillRequest, _sanitize_image, canonicalize
from mercasto_ai.combined import app


def taxonomy() -> list[dict[str, object]]:
    return [
        {
            "slug": "motor",
            "label": "Autos",
            "attributes": [
                {"key": "marca", "type": "select", "options": ["Nissan", "Toyota"]},
                {"key": "modelo", "type": "text", "options": []},
            ],
        },
        {"slug": "servicios", "label": "Servicios", "attributes": []},
    ]


def request() -> AutofillRequest:
    return AutofillRequest(short_text="Nissan Versa usado", taxonomy=taxonomy())


def test_canonicalize_rejects_unknown_category_and_enum() -> None:
    raw = {
        "category": "inventada",
        "attributes": {"marca": "Ferrari", "precio_secreto": "1"},
        "title": "Nissan Versa",
        "description": "Vehículo usado",
        "confidence": {"category": 0.99, "attributes": {"marca": 0.99, "precio_secreto": 0.99}, "title": 0.9, "description": 0.9},
    }
    result = canonicalize(raw, request(), "fixture")
    assert result.category.value is None
    assert result.attributes == {}


def test_canonicalize_keeps_only_allowed_high_confidence_fields() -> None:
    raw = {
        "category": "motor",
        "subcategory_hint": "Autos usados",
        "attributes": {"marca": "Nissan", "modelo": "Versa", "unknown": "x"},
        "title": "Nissan Versa usado",
        "description": "Nissan Versa usado en buen estado visible.",
        "confidence": {
            "category": 0.95,
            "subcategory_hint": 0.7,
            "attributes": {"marca": 0.9, "modelo": 0.8, "unknown": 1.0},
            "title": 0.8,
            "description": 0.8,
        },
    }
    result = canonicalize(raw, request(), "fixture")
    assert result.category.value == "motor"
    assert set(result.attributes) == {"marca", "modelo"}
    assert result.attributes["marca"].value == "Nissan"
    assert result.authoritative is False
    assert result.requires_seller_confirmation is True


def test_image_sanitization_reencodes_without_metadata() -> None:
    source = io.BytesIO()
    image = Image.new("RGB", (64, 64), (120, 30, 20))
    exif = Image.Exif()
    exif[0x010E] = "sensitive metadata"
    image.save(source, format="JPEG", exif=exif)
    cleaned = base64.b64decode(_sanitize_image(base64.b64encode(source.getvalue()).decode("ascii")))
    with Image.open(io.BytesIO(cleaned)) as decoded:
        assert decoded.format == "WEBP"
        assert decoded.getexif() == {}
        assert decoded.width <= 1024
        assert decoded.height <= 1024


def test_endpoint_authenticates_before_parsing(monkeypatch) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "autofill-secret")
    client = TestClient(app)
    response = client.post(
        "/v1/autofill/listing",
        content=b"{" + (b"x" * 100_000),
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 401


def test_endpoint_rejects_missing_input(monkeypatch) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "autofill-secret")
    client = TestClient(app)
    response = client.post(
        "/v1/autofill/listing",
        json={"short_text": "", "images_base64": [], "taxonomy": taxonomy()},
        headers={"X-Mercasto-Internal-Token": "autofill-secret"},
    )
    assert response.status_code == 422
