from __future__ import annotations

from fastapi.testclient import TestClient

from mercasto_ai.combined import app
from mercasto_ai.risk import AccountRiskFeatures, ListingRiskFeatures, score_account, score_listing

REVIEW_SCORE = 40


def account(**overrides: object) -> AccountRiskFeatures:
    values: dict[str, object] = {
        "account_age_days": 365,
        "verified_any": True,
        "ads_1h": 1,
        "ads_24h": 2,
        "messages_1h": 2,
        "distinct_recipients_1h": 1,
        "resolved_user_reports_90d": 0,
        "resolved_ad_reports_90d": 0,
        "violations_90d": 0,
        "admin_rejections_90d": 0,
    }
    values.update(overrides)
    return AccountRiskFeatures(**values)


def listing(**overrides: object) -> ListingRiskFeatures:
    values: dict[str, object] = {
        "token_count": 30,
        "max_token_share": 0.08,
        "contact_pattern_count": 0,
        "exact_duplicate_ads": 0,
        "duplicate_media_ads": 0,
        "resolved_reports_90d": 0,
        "prior_admin_rejections": 0,
        "price_z_score": 0.4,
        "suspicious_keyword_score": 0,
        "no_images_high_value": False,
    }
    values.update(overrides)
    return ListingRiskFeatures(**values)


def combined_score(account_features: AccountRiskFeatures, listing_features: ListingRiskFeatures) -> int:
    return min(
        100,
        score_account(account_features).risk_score + score_listing(listing_features).risk_score,
    )


def test_synthetic_fixture_quality_metrics() -> None:
    fixtures = [
        (False, account(), listing()),
        (False, account(ads_1h=4, ads_24h=8), listing(contact_pattern_count=1)),
        (False, account(account_age_days=3, verified_any=False), listing()),
        (False, account(messages_1h=28, distinct_recipients_1h=5), listing(price_z_score=1.8)),
        (
            True,
            account(account_age_days=0, verified_any=False, ads_1h=8, ads_24h=30),
            listing(exact_duplicate_ads=4, suspicious_keyword_score=25),
        ),
        (
            True,
            account(
                verified_any=False,
                resolved_user_reports_90d=3,
                resolved_ad_reports_90d=3,
                violations_90d=3,
            ),
            listing(resolved_reports_90d=3),
        ),
        (
            True,
            account(verified_any=False, messages_1h=50, distinct_recipients_1h=22),
            listing(contact_pattern_count=3, duplicate_media_ads=4),
        ),
        (
            True,
            account(account_age_days=1, verified_any=False, admin_rejections_90d=5),
            listing(price_z_score=3.5, suspicious_keyword_score=30, no_images_high_value=True),
        ),
    ]

    predictions = [
        combined_score(account_features, listing_features) >= REVIEW_SCORE
        for _, account_features, listing_features in fixtures
    ]
    labels = [label for label, _, _ in fixtures]
    tp = sum(pred and label for pred, label in zip(predictions, labels, strict=True))
    fp = sum(pred and not label for pred, label in zip(predictions, labels, strict=True))
    fn = sum(not pred and label for pred, label in zip(predictions, labels, strict=True))
    tn = sum(not pred and not label for pred, label in zip(predictions, labels, strict=True))

    precision = tp / max(1, tp + fp)
    recall = tp / max(1, tp + fn)
    false_positive_rate = fp / max(1, fp + tn)

    assert precision >= 0.80
    assert recall >= 0.80
    assert false_positive_rate <= 0.20


def test_legitimate_bursty_verified_user_stays_below_review_threshold() -> None:
    score = combined_score(
        account(ads_1h=4, ads_24h=10, messages_1h=20, distinct_recipients_1h=6),
        listing(contact_pattern_count=1, price_z_score=1.5),
    )
    assert score < REVIEW_SCORE


def test_repeated_spam_crosses_review_threshold() -> None:
    score = combined_score(
        account(account_age_days=0, verified_any=False, ads_1h=8, ads_24h=30),
        listing(
            contact_pattern_count=3,
            exact_duplicate_ads=4,
            duplicate_media_ads=3,
            suspicious_keyword_score=30,
        ),
    )
    assert score >= REVIEW_SCORE


def test_thresholds_are_configuration_driven(monkeypatch) -> None:
    monkeypatch.setenv("RISK_HIGH_SCORE", "60")
    result = score_listing(listing(exact_duplicate_ads=4, contact_pattern_count=3))
    assert result.risk_score < 60
    assert result.recommended_action == "observe"


def test_risk_endpoint_requires_internal_token(monkeypatch) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "contract-secret")
    client = TestClient(app)
    payload = {
        "subjects": [
            {
                "subject_id": 42,
                "account": account().model_dump(),
                "listing": listing().model_dump(),
            }
        ]
    }
    response = client.post("/v1/risk/batch", json=payload)
    assert response.status_code == 401


def test_risk_endpoint_returns_shadow_non_authoritative_contract(monkeypatch) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "contract-secret")
    client = TestClient(app)
    payload = {
        "subjects": [
            {
                "subject_id": 42,
                "account": account(verified_any=False, ads_1h=8).model_dump(),
                "listing": listing(exact_duplicate_ads=4).model_dump(),
            }
        ]
    }
    response = client.post(
        "/v1/risk/batch",
        json=payload,
        headers={"X-Mercasto-Internal-Token": "contract-secret"},
    )
    assert response.status_code == 200
    subject = response.json()["subjects"][0]
    assert subject["subject_id"] == 42
    for score in (subject["account"], subject["listing"]):
        assert score["rollout_mode"] == "shadow_assist"
        assert score["authoritative"] is False
        assert score["engine"] == "deterministic_rules"
        assert score["rules_version"] == "risk-rules-v1"
