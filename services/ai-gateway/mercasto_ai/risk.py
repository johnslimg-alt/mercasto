from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from .main import require_internal_token

RiskBand = Literal["low", "medium", "high", "critical"]
RiskAction = Literal["allow", "observe", "manual_review", "urgent_review"]
RolloutMode = Literal["shadow_assist"]
RiskEngine = Literal["deterministic_rules"]


class AccountRiskFeatures(BaseModel):
    account_age_days: int = Field(ge=0, le=36500)
    verified_any: bool = False
    ads_1h: int = Field(ge=0, le=10000)
    ads_24h: int = Field(ge=0, le=100000)
    messages_1h: int = Field(ge=0, le=100000)
    distinct_recipients_1h: int = Field(ge=0, le=100000)
    resolved_user_reports_90d: int = Field(ge=0, le=10000)
    resolved_ad_reports_90d: int = Field(ge=0, le=10000)
    violations_90d: int = Field(ge=0, le=10000)
    admin_rejections_90d: int = Field(ge=0, le=10000)


class ListingRiskFeatures(BaseModel):
    token_count: int = Field(ge=0, le=100000)
    max_token_share: float = Field(ge=0.0, le=1.0)
    contact_pattern_count: int = Field(ge=0, le=1000)
    exact_duplicate_ads: int = Field(ge=0, le=10000)
    duplicate_media_ads: int = Field(ge=0, le=10000)
    resolved_reports_90d: int = Field(ge=0, le=10000)
    prior_admin_rejections: int = Field(ge=0, le=10000)
    price_z_score: float = Field(ge=0.0, le=100.0)
    suspicious_keyword_score: int = Field(ge=0, le=100)
    no_images_high_value: bool = False


class RiskSubject(BaseModel):
    subject_id: int = Field(gt=0)
    account: AccountRiskFeatures
    listing: ListingRiskFeatures


class RiskBatchRequest(BaseModel):
    subjects: list[RiskSubject] = Field(min_length=1, max_length=10)


class RiskScore(BaseModel):
    risk_score: int = Field(ge=0, le=100)
    band: RiskBand
    reason_codes: list[str] = Field(default_factory=list, max_length=30)
    rules_version: str
    engine: RiskEngine = "deterministic_rules"
    rollout_mode: RolloutMode = "shadow_assist"
    authoritative: Literal[False] = False
    recommended_action: RiskAction


class RiskSubjectResponse(BaseModel):
    subject_id: int
    account: RiskScore
    listing: RiskScore


class RiskBatchResponse(BaseModel):
    subjects: list[RiskSubjectResponse]


def _env_int(name: str, default: int, minimum: int = 0, maximum: int = 100000) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return max(minimum, min(maximum, value))


def _env_float(name: str, default: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        value = float(raw)
    except ValueError:
        return default
    return max(minimum, min(maximum, value))


@dataclass(frozen=True)
class RiskRules:
    medium_score: int
    high_score: int
    critical_score: int
    account_new_days: int
    account_very_new_days: int
    ads_1h_high: int
    ads_1h_medium: int
    ads_24h_high: int
    messages_1h_high: int
    recipients_1h_high: int
    recipients_1h_medium: int
    reports_high: int
    violations_high: int
    rejections_high: int
    duplicate_high: int
    token_share_high: float
    contact_patterns_high: int
    price_z_high: float
    price_z_medium: float
    keyword_score_high: int
    keyword_score_medium: int
    rules_version: str

    @classmethod
    def from_env(cls) -> "RiskRules":
        medium = _env_int("RISK_MEDIUM_SCORE", 20, 1, 98)
        high = max(medium + 1, _env_int("RISK_HIGH_SCORE", 40, 2, 99))
        critical = max(high + 1, _env_int("RISK_CRITICAL_SCORE", 70, 3, 100))
        ads_1h_high = _env_int("RISK_ADS_1H_HIGH", 6, 1, 1000)
        ads_1h_medium = min(
            ads_1h_high,
            _env_int("RISK_ADS_1H_MEDIUM", 3, 1, 1000),
        )
        recipients_1h_high = _env_int("RISK_RECIPIENTS_1H_HIGH", 15, 1, 10000)
        recipients_1h_medium = min(
            recipients_1h_high,
            _env_int("RISK_RECIPIENTS_1H_MEDIUM", 8, 1, 10000),
        )
        price_z_high = _env_float("RISK_PRICE_Z_HIGH", 3.0, 0.1, 100.0)
        price_z_medium = min(
            price_z_high,
            _env_float("RISK_PRICE_Z_MEDIUM", 2.0, 0.1, 100.0),
        )
        keyword_score_high = _env_int("RISK_KEYWORD_SCORE_HIGH", 20, 1, 100)
        keyword_score_medium = min(
            keyword_score_high,
            _env_int("RISK_KEYWORD_SCORE_MEDIUM", 10, 1, 100),
        )
        return cls(
            medium_score=medium,
            high_score=high,
            critical_score=critical,
            account_new_days=_env_int("RISK_ACCOUNT_NEW_DAYS", 7, 1, 365),
            account_very_new_days=_env_int("RISK_ACCOUNT_VERY_NEW_DAYS", 1, 0, 30),
            ads_1h_high=ads_1h_high,
            ads_1h_medium=ads_1h_medium,
            ads_24h_high=_env_int("RISK_ADS_24H_HIGH", 20, 1, 10000),
            messages_1h_high=_env_int("RISK_MESSAGES_1H_HIGH", 30, 1, 10000),
            recipients_1h_high=recipients_1h_high,
            recipients_1h_medium=recipients_1h_medium,
            reports_high=_env_int("RISK_RESOLVED_REPORTS_HIGH", 3, 1, 1000),
            violations_high=_env_int("RISK_VIOLATIONS_HIGH", 3, 1, 1000),
            rejections_high=_env_int("RISK_ADMIN_REJECTIONS_HIGH", 5, 1, 1000),
            duplicate_high=_env_int("RISK_DUPLICATE_ADS_HIGH", 3, 1, 1000),
            token_share_high=_env_float("RISK_TOKEN_SHARE_HIGH", 0.30, 0.05, 1.0),
            contact_patterns_high=_env_int("RISK_CONTACT_PATTERNS_HIGH", 3, 1, 1000),
            price_z_high=price_z_high,
            price_z_medium=price_z_medium,
            keyword_score_high=keyword_score_high,
            keyword_score_medium=keyword_score_medium,
            rules_version=os.getenv("RISK_RULES_VERSION", "risk-rules-v1").strip()
            or "risk-rules-v1",
        )


def _result(score: int, reasons: list[str], rules: RiskRules) -> RiskScore:
    bounded = max(0, min(100, score))
    if bounded >= rules.critical_score:
        band: RiskBand = "critical"
        action: RiskAction = "urgent_review"
    elif bounded >= rules.high_score:
        band = "high"
        action = "manual_review"
    elif bounded >= rules.medium_score:
        band = "medium"
        action = "observe"
    else:
        band = "low"
        action = "allow"
    return RiskScore(
        risk_score=bounded,
        band=band,
        reason_codes=list(dict.fromkeys(reasons)),
        rules_version=rules.rules_version,
        recommended_action=action,
    )


def score_account(features: AccountRiskFeatures, rules: RiskRules | None = None) -> RiskScore:
    rules = rules or RiskRules.from_env()
    score = 0
    reasons: list[str] = []

    if features.account_age_days <= rules.account_very_new_days:
        score += 15
        reasons.append("account_very_new")
    elif features.account_age_days < rules.account_new_days:
        score += 8
        reasons.append("account_new")

    if features.ads_1h >= rules.ads_1h_high:
        score += 18
        reasons.append("publication_velocity_high")
    elif features.ads_1h >= rules.ads_1h_medium:
        score += 9
        reasons.append("publication_velocity_elevated")
    if features.ads_24h >= rules.ads_24h_high:
        score += 12
        reasons.append("daily_publication_burst")

    if features.messages_1h >= rules.messages_1h_high:
        score += 10
        reasons.append("message_velocity_high")
    if features.distinct_recipients_1h >= rules.recipients_1h_high:
        score += 16
        reasons.append("recipient_spread_high")
    elif features.distinct_recipients_1h >= rules.recipients_1h_medium:
        score += 8
        reasons.append("recipient_spread_elevated")

    if features.resolved_user_reports_90d >= rules.reports_high:
        score += 18
        reasons.append("resolved_user_reports_repeated")
    elif features.resolved_user_reports_90d > 0:
        score += 6
        reasons.append("resolved_user_report")
    if features.resolved_ad_reports_90d >= rules.reports_high:
        score += 14
        reasons.append("resolved_listing_reports_repeated")
    elif features.resolved_ad_reports_90d > 0:
        score += 5
        reasons.append("resolved_listing_report")
    if features.violations_90d >= rules.violations_high:
        score += 20
        reasons.append("violations_repeated")
    elif features.violations_90d > 0:
        score += 8
        reasons.append("violation_history")
    if features.admin_rejections_90d >= rules.rejections_high:
        score += 15
        reasons.append("admin_rejections_repeated")
    elif features.admin_rejections_90d >= 2:
        score += 7
        reasons.append("admin_rejections_multiple")

    if features.verified_any:
        score = max(0, score - 10)

    return _result(score, reasons, rules)


def score_listing(features: ListingRiskFeatures, rules: RiskRules | None = None) -> RiskScore:
    rules = rules or RiskRules.from_env()
    score = 0
    reasons: list[str] = []

    if features.token_count >= 12 and features.max_token_share >= rules.token_share_high:
        score += 15
        reasons.append("keyword_repetition_high")
    if features.contact_pattern_count >= rules.contact_patterns_high:
        score += 12
        reasons.append("contact_patterns_repeated")
    elif features.contact_pattern_count > 0:
        score += 4
        reasons.append("contact_pattern_present")

    if features.exact_duplicate_ads >= rules.duplicate_high:
        score += 22
        reasons.append("exact_duplicate_ads_repeated")
    elif features.exact_duplicate_ads > 0:
        score += 10
        reasons.append("exact_duplicate_ad")
    if features.duplicate_media_ads >= rules.duplicate_high:
        score += 22
        reasons.append("duplicate_media_repeated")
    elif features.duplicate_media_ads > 0:
        score += 10
        reasons.append("duplicate_media")

    if features.resolved_reports_90d >= rules.reports_high:
        score += 20
        reasons.append("resolved_reports_repeated")
    elif features.resolved_reports_90d > 0:
        score += 8
        reasons.append("resolved_report")
    if features.prior_admin_rejections >= 2:
        score += 12
        reasons.append("prior_admin_rejections")
    elif features.prior_admin_rejections > 0:
        score += 5
        reasons.append("prior_admin_rejection")

    if features.price_z_score >= rules.price_z_high:
        score += 20
        reasons.append("price_anomaly_high")
    elif features.price_z_score >= rules.price_z_medium:
        score += 8
        reasons.append("price_anomaly_elevated")

    if features.suspicious_keyword_score >= rules.keyword_score_high:
        score += 18
        reasons.append("suspicious_keyword_density_high")
    elif features.suspicious_keyword_score >= rules.keyword_score_medium:
        score += 8
        reasons.append("suspicious_keyword_density_elevated")

    if features.no_images_high_value:
        score += 8
        reasons.append("no_images_high_value")

    return _result(score, reasons, rules)


router = APIRouter(prefix="/v1/risk", dependencies=[Depends(require_internal_token)])


@router.post("/batch", response_model=RiskBatchResponse)
def score_risk_batch(request: RiskBatchRequest) -> RiskBatchResponse:
    rules = RiskRules.from_env()
    return RiskBatchResponse(
        subjects=[
            RiskSubjectResponse(
                subject_id=subject.subject_id,
                account=score_account(subject.account, rules),
                listing=score_listing(subject.listing, rules),
            )
            for subject in request.subjects
        ]
    )
