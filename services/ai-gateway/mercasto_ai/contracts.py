from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Decision = Literal["approved", "manual_review", "rejected"]


class ModerationRequest(BaseModel):
    context: str = Field(min_length=1, max_length=200)
    image_base64: str = Field(min_length=16, max_length=6_000_000)


class ModelVerdict(BaseModel):
    decision: Decision
    reason: str = Field(min_length=1, max_length=1000)
    confidence: float = Field(ge=0.0, le=1.0)
    flags: list[str] = Field(default_factory=list, max_length=50)


class ModerationResponse(BaseModel):
    decision: Decision
    reason: str
    confidence: float
    flags: list[str]
    approved: bool


def normalize_verdict(verdict: ModelVerdict) -> ModerationResponse:
    if verdict.decision == "approved" and verdict.confidence >= 0.90:
        effective: Decision = "approved"
        approved = True
    elif verdict.decision == "rejected":
        effective = "rejected"
        approved = False
    else:
        effective = "manual_review"
        approved = False

    return ModerationResponse(
        decision=effective,
        reason=verdict.reason.strip(),
        confidence=verdict.confidence,
        flags=verdict.flags,
        approved=approved,
    )
