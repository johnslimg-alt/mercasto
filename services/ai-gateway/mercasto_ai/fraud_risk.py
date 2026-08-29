from __future__ import annotations

import os
from dataclasses import dataclass

from .contracts import FraudRiskRequest, FraudRiskResponse

_DEFAULT_LOW = 20
_DEFAULT_REVIEW = 40
_DEFAULT_HIGH = 70
_DEFAULT_RULES_VERSION = "2026-08-29-shadow-1"


@dataclass(frozen=True)
class FraudRiskThresholds:
    low: int
    review: int
    high: int


def _bounded_env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return max(0, min(100, value))


def load_thresholds() -> FraudRiskThresholds:
    low = _bounded_env_int("FRAUD_RISK_LOW_THRESHOLD", _DEFAULT_LOW)
    review = _bounded_env_int("FRAUD_RISK_REVIEW_THRESHOLD", _DEFAULT_REVIEW)
    high = _bounded_env_int("FRAUD_RISK_HIGH_THRESHOLD", _DEFAULT_HIGH)
    if not 0 <= low < review < high <= 100:
        return FraudRiskThresholds(_DEFAULT_LOW, _DEFAULT_REVIEW, _DEFAULT_HIGH)
    return FraudRiskThresholds(low=low, review=review, high=high)


def _risk_level(score: int, thresholds: FraudRiskThresholds) -> str:
    if score >= thresholds.high:
        return "high"
    if score >= thresholds.review:
        return "medium"
    if score >= thresholds.low:
        return "low"
    return "none"


def _recommendation(score: int, thresholds: FraudRiskThresholds) -> str:
    if score >= thresholds.high:
        return "prioritize_human_review"
    if score >= thresholds.review:
        return "queue_for_human_review"
    if score >= thresholds.low:
        return "keep_in_assist_only_observation"
    return "observe"


def score_fraud_risk(
    request: FraudRiskRequest,
    *,
    thresholds: FraudRiskThresholds | None = None,
    rules_version: str | None = None,
) -> FraudRiskResponse:
    """Score minimized aggregate signals without taking any authoritative action."""

    effective_thresholds = thresholds or load_thresholds()
    listing_score = 0
    account_score = 0
    reasons: list[str] = []

    if request.price_zscore is not None:
        if request.price_zscore >= 3.0:
            listing_score += 25
            reasons.append("price_anomaly_extreme")
        elif request.price_zscore >= 2.0:
            listing_score += 10
            reasons.append("price_anomaly_unusual")

    if request.duplicate_media_accounts > 0:
        listing_score += min(25, 15 + (request.duplicate_media_accounts - 1) * 2)
        reasons.append("duplicate_media_across_accounts")

    if request.duplicate_text_accounts > 0:
        listing_score += min(20, 10 + (request.duplicate_text_accounts - 1) * 2)
        reasons.append("duplicate_text_across_accounts")

    if request.contact_pattern_hits > 0:
        listing_score += min(15, 5 + request.contact_pattern_hits * 2)
        reasons.append("off_platform_contact_pattern")

    if request.suspicious_url_count > 0:
        listing_score += min(15, 5 + request.suspicious_url_count * 2)
        reasons.append("suspicious_url_pattern")

    if request.keyword_stuffing_score >= 0.80:
        listing_score += 10
        reasons.append("keyword_stuffing_high")
    elif request.keyword_stuffing_score >= 0.60:
        listing_score += 5
        reasons.append("keyword_stuffing_elevated")

    if request.listings_24h > 20:
        account_score += 25
        reasons.append("posting_velocity_high")
    elif request.listings_24h > 10:
        account_score += 10
        reasons.append("posting_velocity_elevated")

    if request.account_age_days < 3 and request.listings_24h > 10:
        account_score += 20
        reasons.append("new_account_bulk_posting")

    if request.edits_24h > 30:
        account_score += 10
        reasons.append("edit_velocity_high")

    if request.failed_flows_24h > 20:
        account_score += 20
        reasons.append("failed_flow_burst_high")
    elif request.failed_flows_24h > 5:
        account_score += 10
        reasons.append("failed_flow_burst_elevated")

    if request.reports_30d >= 5:
        account_score += 20
        reasons.append("report_history_elevated")
    elif request.reports_30d >= 3:
        account_score += 10
        reasons.append("report_history_present")

    listing_score = min(100, listing_score)
    account_score = min(100, account_score)
    total_score = min(100, listing_score + account_score)

    return FraudRiskResponse(
        rules_version=(rules_version or os.getenv("FRAUD_RISK_RULES_VERSION") or _DEFAULT_RULES_VERSION)[:80],
        risk_score=total_score,
        listing_risk_score=listing_score,
        account_risk_score=account_score,
        risk_level=_risk_level(total_score, effective_thresholds),
        reason_codes=list(dict.fromkeys(reasons)),
        requires_manual_review=total_score >= effective_thresholds.review,
        recommendation=_recommendation(total_score, effective_thresholds),
        authoritative_action=None,
    )
