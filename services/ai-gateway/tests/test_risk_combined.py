from fastapi.testclient import TestClient

from mercasto_ai.combined import app
from mercasto_ai.risk import AccountRiskFeatures, ListingRiskFeatures


def test_gateway_classifies_combined_score_with_runtime_thresholds(monkeypatch) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "combined-risk-secret")
    monkeypatch.setenv("RISK_MEDIUM_SCORE", "30")
    monkeypatch.setenv("RISK_HIGH_SCORE", "50")
    monkeypatch.setenv("RISK_CRITICAL_SCORE", "55")
    client = TestClient(app)

    account = AccountRiskFeatures(
        account_age_days=0,
        verified_any=False,
        ads_1h=3,
        ads_24h=2,
        messages_1h=2,
        distinct_recipients_1h=1,
        resolved_user_reports_90d=0,
        resolved_ad_reports_90d=0,
        violations_90d=0,
        admin_rejections_90d=0,
    )
    listing = ListingRiskFeatures(
        token_count=30,
        max_token_share=0.08,
        contact_pattern_count=3,
        exact_duplicate_ads=1,
        duplicate_media_ads=0,
        resolved_reports_90d=0,
        prior_admin_rejections=0,
        price_z_score=2.2,
        suspicious_keyword_score=10,
        no_images_high_value=True,
    )

    response = client.post(
        "/v1/risk/batch",
        json={
            "subjects": [{
                "subject_id": 7,
                "account": account.model_dump(),
                "listing": listing.model_dump(),
            }]
        },
        headers={"X-Mercasto-Internal-Token": "combined-risk-secret"},
    )

    assert response.status_code == 200
    subject = response.json()["subjects"][0]
    combined = subject["combined"]
    assert combined["risk_score"] == min(
        100,
        subject["account"]["risk_score"] + subject["listing"]["risk_score"],
    )
    assert combined["band"] == "critical"
    assert combined["recommended_action"] == "urgent_review"
    assert combined["authoritative"] is False
    assert combined["rollout_mode"] == "shadow_assist"
