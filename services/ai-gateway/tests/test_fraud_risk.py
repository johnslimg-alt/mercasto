from __future__ import annotations

from pydantic import ValidationError
import pytest

from mercasto_ai.contracts import FraudRiskRequest
from mercasto_ai.fraud_risk import FraudRiskThresholds, load_thresholds, score_fraud_risk


def request(**overrides: object) -> FraudRiskRequest:
    payload: dict[str, object] = {
        "account_age_days": 365,
        "listings_24h": 1,
        "edits_24h": 0,
        "reports_30d": 0,
        "failed_flows_24h": 0,
        "duplicate_media_accounts": 0,
        "duplicate_text_accounts": 0,
        "contact_pattern_hits": 0,
        "suspicious_url_count": 0,
        "keyword_stuffing_score": 0.0,
        "price_zscore": None,
    }
    payload.update(overrides)
    return FraudRiskRequest.model_validate(payload)


def test_known_good_bursty_user_stays_non_authoritative_and_below_review() -> None:
    result = score_fraud_risk(request(listings_24h=8, edits_24h=20))

    assert result.risk_score == 0
    assert result.reason_codes == []
    assert result.requires_manual_review is False
    assert result.recommendation == "observe"
    assert result.mode == "shadow_assist"
    assert result.authoritative is False
    assert result.authoritative_action is None


def test_repeated_spam_like_aggregate_signals_are_explainable() -> None:
    result = score_fraud_risk(
        request(
            account_age_days=1,
            listings_24h=28,
            edits_24h=45,
            reports_30d=5,
            failed_flows_24h=25,
            duplicate_media_accounts=3,
            duplicate_text_accounts=4,
            contact_pattern_hits=2,
            suspicious_url_count=2,
            keyword_stuffing_score=0.92,
            price_zscore=3.4,
        )
    )

    assert result.risk_score == 100
    assert result.listing_risk_score > 0
    assert result.account_risk_score > 0
    assert result.requires_manual_review is True
    assert result.risk_level == "high"
    assert "duplicate_media_across_accounts" in result.reason_codes
    assert "posting_velocity_high" in result.reason_codes
    assert "new_account_bulk_posting" in result.reason_codes
    assert result.authoritative_action is None


def test_listing_and_account_scores_are_separate() -> None:
    listing_only = score_fraud_risk(request(price_zscore=3.1, duplicate_text_accounts=2))
    account_only = score_fraud_risk(request(listings_24h=22, failed_flows_24h=7))

    assert listing_only.listing_risk_score > 0
    assert listing_only.account_risk_score == 0
    assert account_only.listing_risk_score == 0
    assert account_only.account_risk_score > 0


def test_thresholds_are_configuration_driven(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FRAUD_RISK_LOW_THRESHOLD", "5")
    monkeypatch.setenv("FRAUD_RISK_REVIEW_THRESHOLD", "15")
    monkeypatch.setenv("FRAUD_RISK_HIGH_THRESHOLD", "30")
    thresholds = load_thresholds()

    result = score_fraud_risk(request(listings_24h=12), thresholds=thresholds)

    assert thresholds == FraudRiskThresholds(low=5, review=15, high=30)
    assert result.risk_score == 10
    assert result.risk_level == "low"
    assert result.requires_manual_review is False


def test_invalid_threshold_order_falls_back_to_safe_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FRAUD_RISK_LOW_THRESHOLD", "90")
    monkeypatch.setenv("FRAUD_RISK_REVIEW_THRESHOLD", "20")
    monkeypatch.setenv("FRAUD_RISK_HIGH_THRESHOLD", "10")

    assert load_thresholds() == FraudRiskThresholds(low=20, review=40, high=70)


def test_raw_sensitive_fields_are_rejected_by_contract() -> None:
    with pytest.raises(ValidationError):
        FraudRiskRequest.model_validate(
            {
                "account_age_days": 2,
                "listings_24h": 12,
                "ip": "203.0.113.10",
                "phone": "+52 000 000 0000",
                "message": "raw private content",
            }
        )
