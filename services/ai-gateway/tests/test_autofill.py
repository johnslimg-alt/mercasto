from __future__ import annotations

import asyncio
import base64
import io

from fastapi.testclient import TestClient
from PIL import Image

from mercasto_ai.autofill import (
    AutofillRequest,
    LocalAutofillClient,
    _sanitize_image,
    canonicalize,
)
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


def test_runtime_never_accepts_model_free_text(monkeypatch) -> None:
    client = LocalAutofillClient()

    async def fail_chat(*args, **kwargs):
        raise AssertionError("text-only autofill must not call the vision model")

    monkeypatch.setattr(client, "_chat", fail_chat)
    result = asyncio.run(client.suggest(request()))

    assert result.category.value == "motor"
    assert result.category.confidence >= 0.8
    assert result.attributes["marca"].value == "Nissan"
    assert "modelo" not in result.attributes
    assert result.title.value == "Nissan Versa usado"
    assert result.description.value == "Nissan Versa usado"


def test_photo_only_runtime_leaves_free_text_empty(monkeypatch) -> None:
    source = io.BytesIO()
    Image.new("RGB", (32, 32), (10, 20, 30)).save(source, format="JPEG")
    photo_request = AutofillRequest(
        short_text="",
        images_base64=[base64.b64encode(source.getvalue()).decode("ascii")],
        taxonomy=taxonomy(),
    )
    client = LocalAutofillClient()

    async def fake_chat(*args, **kwargs):
        return {"category": "motor"}

    monkeypatch.setattr(client, "_chat", fake_chat)
    result = asyncio.run(client.suggest(photo_request))

    assert result.category.value == "motor"
    assert result.category.confidence < 0.8
    assert result.title.value is None
    assert result.description.value is None
    assert result.requires_seller_confirmation is True


def test_rule_category_abstains_on_equal_conflicting_signals() -> None:
    request_value = AutofillRequest(
        short_text="casa iphone",
        taxonomy=[
            {"slug": "inmobiliaria", "label": "Inmuebles", "attributes": []},
            {"slug": "electronica", "label": "Electrónica", "attributes": []},
        ],
    )
    slug, confidence = LocalAutofillClient._rule_category(request_value, "casa iphone")
    assert slug is None
    assert confidence == 0.0


def test_rule_category_matches_representative_marketplace_phrases() -> None:
    taxonomy_value = [
        {"slug": slug, "label": slug, "attributes": []}
        for slug in [
            "electronica", "motor", "inmobiliaria", "servicios", "empleo", "moda",
            "hogar", "mascotas", "formacion", "boletos", "turismo", "infantil",
        ]
    ]
    cases = [
        ("iPhone 15 Pro usado", "electronica"),
        ("Nissan Versa 2022", "motor"),
        ("Casa de dos recámaras", "inmobiliaria"),
        ("Servicio de plomería a domicilio", "servicios"),
        ("Vacante de tiempo completo", "empleo"),
        ("Vestido de fiesta talla M", "moda"),
        ("Sofá para sala usado", "hogar"),
        ("Croquetas para perro", "mascotas"),
        ("Clases de inglés particulares", "formacion"),
        ("Boletos concierto CDMX", "boletos"),
        ("Hotel en Cancún fin de semana", "turismo"),
        ("Juguete para niño de 5 años", "infantil"),
    ]
    request_value = AutofillRequest(short_text="fixture", taxonomy=taxonomy_value)
    for phrase, expected in cases:
        slug, confidence = LocalAutofillClient._rule_category(request_value, phrase)
        assert slug == expected, phrase
        assert confidence >= 0.8


def test_enum_matching_requires_token_boundaries() -> None:
    req = AutofillRequest(
        short_text="iPhone algo usado",
        taxonomy=[{
            "slug": "electronica",
            "label": "Electrónica",
            "attributes": [{"key": "marca", "type": "select", "options": ["LG", "Otra"]}],
        }],
    )
    result = asyncio.run(LocalAutofillClient().suggest(req))
    assert result.category.value == "electronica"
    assert "marca" not in result.attributes


def test_rule_category_respects_english_locale() -> None:
    req = AutofillRequest(
        short_text="house for sale",
        locale="en",
        taxonomy=[
            {"slug": "inmobiliaria", "label": "Real Estate", "attributes": []},
            {"slug": "servicios", "label": "Services", "attributes": []},
        ],
    )
    slug, confidence = LocalAutofillClient._rule_category(req, req.short_text)
    assert slug == "inmobiliaria"
    assert confidence >= 0.9


def test_rule_subcategory_returns_canonical_live_hint() -> None:
    hint, confidence = LocalAutofillClient._rule_subcategory("motor", "Nissan Versa 2022")
    assert hint == "Autos"
    assert confidence >= 0.9
