from dataclasses import dataclass

from mercasto_ai.autofill import AutofillRequest, canonicalize


TAXONOMY = [
    {
        "slug": "motor",
        "label": "Autos",
        "attributes": [{"key": "marca", "type": "select", "options": ["Nissan", "Toyota"]}],
    },
    {
        "slug": "inmobiliaria",
        "label": "Inmuebles",
        "attributes": [{"key": "tipo", "type": "select", "options": ["Casa", "Departamento"]}],
    },
    {
        "slug": "servicios",
        "label": "Servicios",
        "attributes": [{"key": "tipo", "type": "select", "options": ["Plomería", "Electricidad"]}],
    },
    {
        "slug": "empleo",
        "label": "Empleo",
        "attributes": [{"key": "modalidad", "type": "select", "options": ["Tiempo completo", "Medio tiempo"]}],
    },
    {
        "slug": "electronica",
        "label": "Electrónica",
        "attributes": [{"key": "marca", "type": "select", "options": ["Samsung", "LG"]}],
    },
]


@dataclass(frozen=True)
class Fixture:
    name: str
    short_text: str
    expected_category: str
    ranked_categories: tuple[str, ...]
    expected_attributes: dict[str, str]
    raw: dict[str, object]


def model_raw(category: str, attributes: dict[str, str], title: str) -> dict[str, object]:
    return {
        "category": category,
        "subcategory_hint": None,
        "attributes": attributes,
        "title": title,
        "description": f"{title}. Verifica los detalles antes de publicar.",
        "confidence": {
            "category": 0.92,
            "subcategory_hint": 0.0,
            "attributes": {key: 0.88 for key in attributes},
            "title": 0.86,
            "description": 0.82,
        },
    }


FIXTURES = [
    Fixture(
        "autos",
        "Nissan Versa usado",
        "motor",
        ("motor", "electronica", "servicios"),
        {"marca": "Nissan"},
        model_raw("motor", {"marca": "Nissan"}, "Nissan Versa usado"),
    ),
    Fixture(
        "inmuebles",
        "Casa de dos recámaras",
        "inmobiliaria",
        ("inmobiliaria", "servicios", "hogar"),
        {"tipo": "Casa"},
        model_raw("inmobiliaria", {"tipo": "Casa"}, "Casa de dos recámaras"),
    ),
    Fixture(
        "servicios",
        "Servicio de plomería a domicilio",
        "servicios",
        ("servicios", "empleo", "hogar"),
        {"tipo": "Plomería"},
        model_raw("servicios", {"tipo": "Plomería"}, "Servicio de plomería"),
    ),
    Fixture(
        "empleo",
        "Vacante de tiempo completo",
        "empleo",
        ("empleo", "servicios", "negocios"),
        {"modalidad": "Tiempo completo"},
        model_raw("empleo", {"modalidad": "Tiempo completo"}, "Vacante de tiempo completo"),
    ),
    Fixture(
        "producto_general",
        "Televisor Samsung usado",
        "electronica",
        ("electronica", "hogar", "productos"),
        {"marca": "Samsung"},
        model_raw("electronica", {"marca": "Samsung"}, "Televisor Samsung usado"),
    ),
]


def test_representative_offline_fixture_metrics() -> None:
    top1_hits = 0
    top3_hits = 0
    predicted_attributes = 0
    correct_attributes = 0

    for fixture in FIXTURES:
        request = AutofillRequest(short_text=fixture.short_text, taxonomy=TAXONOMY)
        result = canonicalize(fixture.raw, request, "offline-fixture")
        top1_hits += int(result.category.value == fixture.expected_category)
        top3_hits += int(fixture.expected_category in fixture.ranked_categories[:3])

        for key, suggestion in result.attributes.items():
            predicted_attributes += 1
            correct_attributes += int(fixture.expected_attributes.get(key) == suggestion.value)

    top1_accuracy = top1_hits / len(FIXTURES)
    top3_accuracy = top3_hits / len(FIXTURES)
    field_precision = correct_attributes / max(1, predicted_attributes)

    assert top1_accuracy >= 0.80
    assert top3_accuracy == 1.0
    assert field_precision >= 0.90


def test_low_confidence_and_hallucinated_values_are_not_returned() -> None:
    request = AutofillRequest(short_text="objeto ambiguo", taxonomy=TAXONOMY)
    result = canonicalize(
        {
            "category": "motor",
            "attributes": {"marca": "Ferrari", "serial": "XYZ"},
            "title": "Afirmación insegura",
            "description": "Dato no confirmado",
            "confidence": {
                "category": 0.20,
                "attributes": {"marca": 0.99, "serial": 1.0},
                "title": 0.20,
                "description": 0.20,
            },
        },
        request,
        "offline-fixture",
    )

    assert result.category.value is None
    assert result.attributes == {}
    assert result.title.value is None
    assert result.description.value is None
