from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from .main import require_internal_token
from .risk import (
    RiskBatchRequest,
    RiskRules,
    RiskScore,
    _result,
    score_account,
    score_listing,
)


class RiskSubjectResponse(BaseModel):
    subject_id: int
    account: RiskScore
    listing: RiskScore
    combined: RiskScore


class RiskBatchResponse(BaseModel):
    subjects: list[RiskSubjectResponse]


router = APIRouter(prefix="/v1/risk", dependencies=[Depends(require_internal_token)])


@router.post("/batch", response_model=RiskBatchResponse)
def score_risk_batch(request: RiskBatchRequest) -> RiskBatchResponse:
    rules = RiskRules.from_env()
    subjects: list[RiskSubjectResponse] = []
    for subject in request.subjects:
        account = score_account(subject.account, rules)
        listing = score_listing(subject.listing, rules)
        combined_reasons = list(dict.fromkeys([*account.reason_codes, *listing.reason_codes]))
        combined = _result(
            min(100, account.risk_score + listing.risk_score),
            combined_reasons,
            rules,
        )
        subjects.append(
            RiskSubjectResponse(
                subject_id=subject.subject_id,
                account=account,
                listing=listing,
                combined=combined,
            )
        )

    return RiskBatchResponse(subjects=subjects)
