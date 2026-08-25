from __future__ import annotations

import base64
import binascii
import hmac
import os
import time
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, status
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from .contracts import (
    ListingModerationRequest,
    ListingModerationResponse,
    ModerationRequest,
    ModerationResponse,
    normalize_listing_verdict,
    normalize_verdict,
)
from .ollama import OllamaModerationClient, OllamaUnavailable

_GATEWAY_VERSION = "0.2.0"
_MAX_PUBLIC_IMAGE_DECODED_BYTES = 4 * 1024 * 1024
_MAX_LISTING_IMAGE_DECODED_BYTES = 5 * 1024 * 1024
_MAX_LISTING_DECODED_IMAGE_BYTES = 10 * 1024 * 1024
_MAX_LISTING_REQUEST_BODY_BYTES = 18 * 1024 * 1024
_MAX_MODEL_DESCRIPTION_CHARS = 6_000
_MAX_MODEL_POLICY_SIGNAL_CHARS = 2_500
_MAX_MODEL_IMAGES = 2
_LISTING_MODEL_CONTEXT_TOKENS = 8_192
_LISTING_MODERATION_PATH = "/v1/moderation/listing"


def _validate_internal_token(token: str | None) -> None:
    expected = os.getenv("MERCASTO_AI_INTERNAL_TOKEN", "")
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Internal AI authentication is not configured.",
        )
    if token is None or not hmac.compare_digest(token, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal service credential.",
        )


class ListingRequestBoundaryMiddleware:
    """Authenticate and bound listing bodies before FastAPI JSON parsing."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if (
            scope["type"] != "http"
            or scope.get("method") != "POST"
            or scope.get("path") != _LISTING_MODERATION_PATH
        ):
            await self.app(scope, receive, send)
            return

        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        token_bytes = headers.get(b"x-mercasto-internal-token")
        token = token_bytes.decode("latin-1") if token_bytes is not None else None
        try:
            _validate_internal_token(token)
        except HTTPException as exc:
            response = JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
            await response(scope, receive, send)
            return

        content_length = headers.get(b"content-length")
        if content_length is not None:
            try:
                declared_bytes = int(content_length)
            except ValueError:
                response = JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"detail": "Invalid Content-Length header."},
                )
                await response(scope, receive, send)
                return
            if declared_bytes < 0:
                response = JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"detail": "Invalid Content-Length header."},
                )
                await response(scope, receive, send)
                return
            if declared_bytes > _MAX_LISTING_REQUEST_BODY_BYTES:
                response = JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={"detail": "Listing moderation request body is too large."},
                )
                await response(scope, receive, send)
                return

        chunks: list[bytes] = []
        received_bytes = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            if message["type"] != "http.request":
                continue

            chunk = message.get("body", b"")
            received_bytes += len(chunk)
            if received_bytes > _MAX_LISTING_REQUEST_BODY_BYTES:
                response = JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={"detail": "Listing moderation request body is too large."},
                )
                await response(scope, receive, send)
                return
            chunks.append(chunk)
            if not message.get("more_body", False):
                break

        buffered_body = b"".join(chunks)
        chunks.clear()
        replayed = False

        async def replay_receive() -> dict[str, object]:
            nonlocal replayed
            if replayed:
                return {"type": "http.request", "body": b"", "more_body": False}
            replayed = True
            return {"type": "http.request", "body": buffered_body, "more_body": False}

        await self.app(scope, replay_receive, send)


app = FastAPI(
    title="Mercasto AI Gateway",
    version=_GATEWAY_VERSION,
    docs_url=None,
    redoc_url=None,
)
app.add_middleware(ListingRequestBoundaryMiddleware)


def get_ollama_client() -> OllamaModerationClient:
    return OllamaModerationClient(
        base_url=os.getenv("OLLAMA_BASE_URL", "http://ollama:11434"),
        model=os.getenv("OLLAMA_VISION_MODEL", "qwen3-vl:4b-instruct"),
        timeout_seconds=float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "90")),
    )


def require_internal_token(
    token: Annotated[str | None, Header(alias="X-Mercasto-Internal-Token")] = None,
) -> None:
    _validate_internal_token(token)


InternalAuth = Annotated[None, Depends(require_internal_token)]
OllamaClient = Annotated[OllamaModerationClient, Depends(get_ollama_client)]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "mercasto-ai-gateway"}


def _decoded_image_size(image_base64: str, *, max_decoded_bytes: int) -> int:
    try:
        decoded = base64.b64decode(image_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="image_base64 must contain valid base64 data.",
        ) from exc

    if len(decoded) > max_decoded_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Decoded image exceeds the internal moderation limit.",
        )
    return len(decoded)


def _budget_policy_signals(policy_signals: list[str]) -> list[str]:
    selected: list[str] = []
    used_chars = 0
    for signal in policy_signals:
        separator_chars = 2 if selected else 0
        next_chars = len(signal) + separator_chars
        if used_chars + next_chars > _MAX_MODEL_POLICY_SIGNAL_CHARS:
            break
        selected.append(signal)
        used_chars += next_chars
    return selected


@app.post("/v1/moderation/image", response_model=ModerationResponse)
async def moderate_image(
    request: ModerationRequest,
    _auth: InternalAuth,
    client: OllamaClient,
) -> ModerationResponse:
    _decoded_image_size(
        request.image_base64,
        max_decoded_bytes=_MAX_PUBLIC_IMAGE_DECODED_BYTES,
    )

    try:
        verdict = await client.moderate(request.context, request.image_base64)
    except OllamaUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Local AI moderation is unavailable.",
        ) from exc

    return normalize_verdict(verdict)


@app.post("/v1/moderation/listing", response_model=ListingModerationResponse)
async def moderate_listing(
    request: ListingModerationRequest,
    _auth: InternalAuth,
    client: OllamaClient,
) -> ListingModerationResponse:
    decoded_total = sum(
        _decoded_image_size(image, max_decoded_bytes=_MAX_LISTING_IMAGE_DECODED_BYTES)
        for image in request.images_base64
    )
    if decoded_total > _MAX_LISTING_DECODED_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Combined listing images exceed the internal moderation limit.",
        )

    canonical_signals = list(dict.fromkeys(request.policy_signals))
    model_policy_signals = _budget_policy_signals(canonical_signals)
    description_for_model = request.description[:_MAX_MODEL_DESCRIPTION_CHARS]
    images_for_model = request.images_base64[:_MAX_MODEL_IMAGES]
    input_description_chars = request.effective_source_description_chars
    input_image_count = request.effective_source_image_count
    description_truncated = input_description_chars > len(description_for_model)
    images_omitted = input_image_count - len(images_for_model)
    policy_signals_omitted = len(canonical_signals) - len(model_policy_signals)

    started = time.perf_counter()
    try:
        verdict = await client.moderate_listing(
            request.title,
            description_for_model,
            images_for_model,
            model_policy_signals,
        )
    except OllamaUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Local AI moderation is unavailable.",
        ) from exc
    latency_ms = max(0, round((time.perf_counter() - started) * 1000))

    # Python is an assist-only boundary. Laravel supplies the policy vocabulary,
    # remains authoritative, and must never receive model-invented policy flags.
    allowed = set(model_policy_signals)
    filtered_flags = [flag for flag in verdict.flags if flag in allowed]
    normalized = normalize_listing_verdict(verdict.model_copy(update={"flags": filtered_flags}))

    incomplete_model_input = description_truncated or images_omitted > 0 or policy_signals_omitted > 0
    if incomplete_model_input and normalized.decision != "manual_review":
        normalized = normalized.model_copy(update={"decision": "manual_review", "approved": False})

    return ListingModerationResponse(
        **normalized.model_dump(),
        model=client.model,
        gateway_version=_GATEWAY_VERSION,
        latency_ms=latency_ms,
        description_truncated=description_truncated,
        input_description_chars=input_description_chars,
        model_description_chars=len(description_for_model),
        input_image_count=input_image_count,
        model_image_count=len(images_for_model),
        images_omitted=images_omitted,
        input_policy_signal_count=len(canonical_signals),
        model_policy_signal_count=len(model_policy_signals),
        policy_signals_omitted=policy_signals_omitted,
        model_context_tokens=_LISTING_MODEL_CONTEXT_TOKENS,
    )
