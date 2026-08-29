from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable, Literal

from .contracts import Decision

ExpectedClass = Literal["allowed", "risk"]


@dataclass(frozen=True)
class QualityObservation:
    fixture: str
    category: str
    expected: ExpectedClass
    decision: Decision
    confidence: float

    @property
    def predicted_risk(self) -> bool:
        # In the assist-only rollout, any non-approved result is a conservative
        # positive signal for human review. This never makes an authoritative
        # moderation decision by itself.
        return self.decision != "approved"

    @property
    def expected_risk(self) -> bool:
        return self.expected == "risk"


@dataclass(frozen=True)
class QualityMetrics:
    total: int
    true_positive: int
    false_positive: int
    true_negative: int
    false_negative: int
    precision: float
    recall: float
    false_positive_rate: float
    false_negative_rate: float
    accuracy: float


def _ratio(numerator: int, denominator: int) -> float:
    return numerator / denominator if denominator else 0.0


def measure_quality(observations: Iterable[QualityObservation]) -> QualityMetrics:
    tp = fp = tn = fn = 0

    for observation in observations:
        predicted = observation.predicted_risk
        expected = observation.expected_risk
        if expected and predicted:
            tp += 1
        elif not expected and predicted:
            fp += 1
        elif not expected and not predicted:
            tn += 1
        else:
            fn += 1

    total = tp + fp + tn + fn
    return QualityMetrics(
        total=total,
        true_positive=tp,
        false_positive=fp,
        true_negative=tn,
        false_negative=fn,
        precision=_ratio(tp, tp + fp),
        recall=_ratio(tp, tp + fn),
        false_positive_rate=_ratio(fp, fp + tn),
        false_negative_rate=_ratio(fn, fn + tp),
        accuracy=_ratio(tp + tn, total),
    )


def load_jsonl(path: Path) -> list[QualityObservation]:
    observations: list[QualityObservation] = []
    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
            observation = QualityObservation(
                fixture=str(payload["fixture"]),
                category=str(payload["category"]),
                expected=payload["expected"],
                decision=payload["decision"],
                confidence=float(payload["confidence"]),
            )
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise ValueError(f"invalid quality observation on line {line_number}") from exc
        if observation.expected not in {"allowed", "risk"}:
            raise ValueError(f"invalid expected class on line {line_number}")
        if observation.decision not in {"approved", "manual_review", "rejected"}:
            raise ValueError(f"invalid moderation decision on line {line_number}")
        if not 0.0 <= observation.confidence <= 1.0:
            raise ValueError(f"invalid confidence on line {line_number}")
        observations.append(observation)
    return observations


def render_report(observations: Iterable[QualityObservation]) -> dict[str, object]:
    materialized = list(observations)
    metrics = measure_quality(materialized)
    categories = sorted({observation.category for observation in materialized})
    return {
        "schema_version": 1,
        "rollout_mode": "shadow_assist",
        "authoritative": False,
        "quality_metrics": asdict(metrics),
        "categories": {
            category: asdict(
                measure_quality(
                    observation for observation in materialized if observation.category == category
                )
            )
            for category in categories
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Measure privacy-safe moderation quality observations without enforcing decisions."
    )
    parser.add_argument("observations", type=Path, help="JSONL observations from a synthetic benchmark")
    parser.add_argument("--output", type=Path, help="Optional path for the JSON report")
    args = parser.parse_args()

    report = render_report(load_jsonl(args.observations))
    encoded = json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.write_text(encoded, encoding="utf-8")
    else:
        print(encoded, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
