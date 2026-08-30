from __future__ import annotations

import json
from pathlib import Path

import pytest

from mercasto_ai.quality import (
    QualityObservation,
    load_jsonl,
    measure_quality,
    render_report,
)


def observation(
    fixture: str,
    category: str,
    expected: str,
    decision: str,
    confidence: float = 0.9,
) -> QualityObservation:
    return QualityObservation(
        fixture=fixture,
        category=category,
        expected=expected,  # type: ignore[arg-type]
        decision=decision,  # type: ignore[arg-type]
        confidence=confidence,
    )


def test_required_fixture_classes_produce_explicit_false_negative_metrics() -> None:
    observations = [
        observation("allowed-lamp", "allowed", "allowed", "approved", 0.97),
        observation("weapon", "weapons", "risk", "rejected", 0.99),
        observation("adult", "explicit_adult", "risk", "manual_review", 0.88),
        observation("controlled", "controlled_product", "risk", "rejected", 0.96),
        # Deliberate miss proves the report records false negatives rather than
        # allowing an all-green fixture gate to hide them.
        observation("fraud", "fraud", "risk", "approved", 0.91),
    ]

    metrics = measure_quality(observations)

    assert metrics.total == 5
    assert metrics.true_positive == 3
    assert metrics.false_positive == 0
    assert metrics.true_negative == 1
    assert metrics.false_negative == 1
    assert metrics.precision == 1.0
    assert metrics.recall == 0.75
    assert metrics.false_positive_rate == 0.0
    assert metrics.false_negative_rate == 0.25
    assert metrics.accuracy == 0.8


def test_manual_review_for_allowed_fixture_is_counted_as_false_positive() -> None:
    metrics = measure_quality(
        [
            observation("allowed-review", "allowed", "allowed", "manual_review", 0.55),
            observation("allowed-pass", "allowed", "allowed", "approved", 0.97),
        ]
    )

    assert metrics.false_positive == 1
    assert metrics.true_negative == 1
    assert metrics.false_positive_rate == 0.5


def test_report_is_explicitly_non_authoritative_and_breaks_down_categories() -> None:
    report = render_report(
        [
            observation("safe", "allowed", "allowed", "approved"),
            observation("risk", "weapons", "risk", "manual_review"),
        ]
    )

    assert report["rollout_mode"] == "shadow_assist"
    assert report["authoritative"] is False
    assert report["quality_metrics"]["total"] == 2  # type: ignore[index]
    assert report["categories"]["allowed"]["true_negative"] == 1  # type: ignore[index]
    assert report["categories"]["weapons"]["true_positive"] == 1  # type: ignore[index]


def test_jsonl_loader_rejects_invalid_or_unbounded_observations(tmp_path: Path) -> None:
    fixture = tmp_path / "quality.jsonl"
    fixture.write_text(
        json.dumps(
            {
                "fixture": "safe",
                "category": "allowed",
                "expected": "allowed",
                "decision": "approved",
                "confidence": 1.1,
            }
        )
        + "\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="invalid confidence"):
        load_jsonl(fixture)


def test_jsonl_loader_accepts_privacy_safe_aggregate_observations(tmp_path: Path) -> None:
    fixture = tmp_path / "quality.jsonl"
    fixture.write_text(
        "\n".join(
            [
                json.dumps(
                    {
                        "fixture": "allowed-product",
                        "category": "allowed",
                        "expected": "allowed",
                        "decision": "approved",
                        "confidence": 0.98,
                    }
                ),
                json.dumps(
                    {
                        "fixture": "synthetic-weapon",
                        "category": "weapons",
                        "expected": "risk",
                        "decision": "manual_review",
                        "confidence": 0.82,
                    }
                ),
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    observations = load_jsonl(fixture)

    assert [item.fixture for item in observations] == ["allowed-product", "synthetic-weapon"]
    assert measure_quality(observations).recall == 1.0
