from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator

Decision = Literal["approved", "manual_review", "rejected"]
PublicImageBase64 = Annotated[str, Field(min_length=16, max_length=6_000_000)]
ListingImageBase64 = Annotated[str, Field(min_length=16, max_length=7_000_000)]
CanonicalSignal = Annotated[str, Field(min_length=1, max_length=80, pattern=r"^[a-z0-9_]+$")]


class ModerationRequest(BaseModel):
    context: str = Field(min_length=1, max_length=200)
    image_base64: PublicImageBase64


class ListingModerationRequest(BaseModel):
    title: str = Field(default="", max_length=255)
    description: str = Field(default="", max_length=12_000)
    source_description_chars: int | None = Field(default=None, ge=0)
    images_base64: list[ListingImageBase64] = Field(default_factory=list, max_length=2)
    source_image_count: int | None = Field(default=None, ge=0, le=10)
    policy_signals: list[CanonicalSignal] = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def validate_preprocessed_listing_shape(self) -> ListingModerationRequest:
        if not self.title.strip() and not self.description.strip() and not self.images_base64:
            raise ValueError("listing moderation requires text or at least one image")
        if (
            self.source_description_chars is not None
            and self.source_description_chars < len(self.description)
        ):
            raise ValueError("source_description_chars cannot be smaller than description length")
        if self.source_image_count is not None and self.source_image_count < len(self.images_base64):
            raise ValueError("source_image_count cannot be smaller than supplied image count")
        return self

    @property
    def effective_source_description_chars(self) -> int:
        return self.source_description_chars or len(self.description)

    @property
    def effective_source_image_count(self) -> int:
        return self.source_image_count if self.source_image_count is not None else len(self.images_base64)


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


class ListingModerationResponse(ModerationResponse):
    provider: Literal["ollama"] = "ollama"
    model: str
    runtime: Literal["private_local"] = "private_local"
    gateway_version: str
    latency_ms: int = Field(ge=0)
    rollout_mode: Literal["shadow_assist"] = "shadow_assist"
    authoritative: Literal[False] = False
    description_truncated: bool = False
    input_description_chars: int = Field(ge=0)
    model_description_chars: int = Field(ge=0)
    input_image_count: int = Field(ge=0, le=10)
    model_image_count: int = Field(ge=0, le=2)
    images_omitted: int = Field(ge=0, le=10)
    input_policy_signal_count: int = Field(ge=0, le=200)
    model_policy_signal_count: int = Field(ge=0, le=200)
    policy_signals_omitted: int = Field(ge=0, le=200)
    model_context_tokens: int = Field(ge=1)


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


def normalize_listing_verdict(verdict: ModelVerdict) -> ModerationResponse:
    if verdict.decision == "approved" and verdict.confidence >= 0.85:
        effective: Decision = "approved"
        approved = True
    elif verdict.decision == "rejected" and verdict.confidence >= 0.90:
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
