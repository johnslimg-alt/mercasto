from __future__ import annotations

import base64
import binascii
import hmac
import json
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
from .ollama import (
    LISTING_MODEL_CONTEXT_TOKENS,
    OllamaModerationClient,
    OllamaUnavailable,
    estimate_listing_context_tokens,
)

_GATEWAY_VERSION = "0.2.0"
_MAX_PUBLIC_IMAGE_DECODED_BYTES = 4 * 1024 * 1024
_MAX_LISTING_IMAGE_DECODED_BYTES = 5 * 1024 * 1024
_MAX_LISTING_DECODED_IMAGE_BYTES = 10 * 1024 * 1024
_MAX_LISTING_REQUEST_BODY_BYTES = 18 * 1024 * 1024
_MAX_MODEL_DESCRIPTION_CHARS = 6_000
_MAX_MODEL_POLICY_SIGNAL_CHARS = 2_500
_MAX_MODEL_IMAGES = 2
_LISTING_MODEL_CONTEXT_TOKENS = LISTING_MODEL_CONTEXT_TOKENS
_LISTING_MODERATION_PATH = "/v1/moderation/listing"
_LISTING_JSON_KEY_RAW_BYTES = 128
_LISTING_TITLE_RAW_BYTES = 4_096
_LISTING_DESCRIPTION_RAW_BYTES = 160_000
_LISTING_IMAGE_RAW_BYTES = 7_100_000
_LISTING_POLICY_SIGNAL_RAW_BYTES = 512
_LISTING_INTEGER_RAW_BYTES = 32


class _ListingJsonShapeError(ValueError):
    pass


def _skip_json_whitespace(body: bytes, index: int) -> int:
    while index < len(body) and body[index] in b" \t\r\n":
        index += 1
    return index


def _scan_json_string(body: bytes, index: int, *, raw_limit: int) -> int:
    if index >= len(body) or body[index] != 0x22:
        raise _ListingJsonShapeError("expected JSON string")
    start = index
    index += 1
    while index < len(body):
        byte = body[index]
        if byte == 0x22:
            end = index + 1
            if end - start > raw_limit:
                raise _ListingJsonShapeError("JSON string exceeds structural limit")
            return end
        if byte == 0x5C:
            if index + 1 >= len(body):
                raise _ListingJsonShapeError("unterminated JSON escape")
            escape = body[index + 1]
            if escape == ord("u"):
                if index + 6 > len(body):
                    raise _ListingJsonShapeError("incomplete unicode escape")
                hex_digits = body[index + 2:index + 6]
                if any(chr(value) not in "0123456789abcdefABCDEF" for value in hex_digits):
                    raise _ListingJsonShapeError("invalid unicode escape")
                code_unit = int(hex_digits.decode("ascii"), 16)
                if 0xD800 <= code_unit <= 0xDBFF:
                    pair_index = index + 6
                    if pair_index + 6 > len(body) or body[pair_index:pair_index + 2] != b"\\u":
                        raise _ListingJsonShapeError("unpaired high unicode surrogate")
                    low_digits = body[pair_index + 2:pair_index + 6]
                    if any(chr(value) not in "0123456789abcdefABCDEF" for value in low_digits):
                        raise _ListingJsonShapeError("invalid unicode surrogate escape")
                    low_unit = int(low_digits.decode("ascii"), 16)
                    if not 0xDC00 <= low_unit <= 0xDFFF:
                        raise _ListingJsonShapeError("unpaired high unicode surrogate")
                    index = pair_index + 6
                    continue
                if 0xDC00 <= code_unit <= 0xDFFF:
                    raise _ListingJsonShapeError("unpaired low unicode surrogate")
                index += 6
                continue
            if escape not in b'"\\/bfnrt':
                raise _ListingJsonShapeError("invalid JSON escape")
            index += 2
            continue
        if byte < 0x20:
            raise _ListingJsonShapeError("control character in JSON string")
        index += 1
    raise _ListingJsonShapeError("unterminated JSON string")


def _scan_json_string_array(
    body: bytes,
    index: int,
    *,
    max_items: int,
    item_raw_limit: int,
) -> int:
    if index >= len(body) or body[index] != 0x5B:
        raise _ListingJsonShapeError("expected JSON array")
    index = _skip_json_whitespace(body, index + 1)
    if index < len(body) and body[index] == 0x5D:
        return index + 1
    count = 0
    while True:
        if count >= max_items:
            raise _ListingJsonShapeError("JSON array exceeds structural item limit")
        index = _scan_json_string(body, index, raw_limit=item_raw_limit)
        count += 1
        index = _skip_json_whitespace(body, index)
        if index >= len(body):
            raise _ListingJsonShapeError("unterminated JSON array")
        if body[index] == 0x5D:
            return index + 1
        if body[index] != 0x2C:
            raise _ListingJsonShapeError("expected JSON array separator")
        index = _skip_json_whitespace(body, index + 1)


def _scan_json_integer_or_null(body: bytes, index: int) -> int:
    if body.startswith(b"null", index):
        return index + 4
    start = index
    if index < len(body) and body[index] == 0x2D:
        index += 1
    if index >= len(body) or body[index] not in b"0123456789":
        raise _ListingJsonShapeError("expected JSON integer or null")
    if body[index] == ord("0"):
        index += 1
        if index < len(body) and body[index] in b"0123456789":
            raise _ListingJsonShapeError("invalid leading zero")
    else:
        while index < len(body) and body[index] in b"0123456789":
            index += 1
    if index - start > _LISTING_INTEGER_RAW_BYTES:
        raise _ListingJsonShapeError("integer exceeds structural limit")
    return index


def _validate_listing_json_shape(body: bytes) -> None:
    index = _skip_json_whitespace(body, 0)
    if index >= len(body) or body[index] != 0x7B:
        raise _ListingJsonShapeError("expected top-level object")
    index = _skip_json_whitespace(body, index + 1)
    seen: set[str] = set()
    if index < len(body) and body[index] == 0x7D:
        index += 1
    else:
        while True:
            key_start = index
            key_end = _scan_json_string(body, index, raw_limit=_LISTING_JSON_KEY_RAW_BYTES)
            try:
                key = json.loads(body[key_start:key_end].decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise _ListingJsonShapeError("invalid JSON key") from exc
            if not isinstance(key, str) or key in seen:
                raise _ListingJsonShapeError("invalid or duplicate JSON key")
            seen.add(key)
            index = _skip_json_whitespace(body, key_end)
            if index >= len(body) or body[index] != 0x3A:
                raise _ListingJsonShapeError("expected JSON key separator")
            index = _skip_json_whitespace(body, index + 1)
            if key == "title":
                index = _scan_json_string(body, index, raw_limit=_LISTING_TITLE_RAW_BYTES)
            elif key == "description":
                index = _scan_json_string(body, index, raw_limit=_LISTING_DESCRIPTION_RAW_BYTES)
            elif key == "images_base64":
                index = _scan_json_string_array(body, index, max_items=2, item_raw_limit=_LISTING_IMAGE_RAW_BYTES)
            elif key == "policy_signals":
                index = _scan_json_string_array(body, index, max_items=200, item_raw_limit=_LISTING_POLICY_SIGNAL_RAW_BYTES)
            elif key in {"source_description_chars", "source_image_count"}:
                index = _scan_json_integer_or_null(body, index)
            else:
                raise _ListingJsonShapeError("unknown listing moderation field")
            index = _skip_json_whitespace(body, index)
            if index >= len(body):
                raise _ListingJsonShapeError("unterminated top-level object")
            if body[index] == 0x7D:
                index += 1
                break
            if body[index] != 0x2C:
                raise _ListingJsonShapeError("expected top-level separator")
            index = _skip_json_whitespace(body, index + 1)
    if _skip_json_whitespace(body, index) != len(body):
        raise _ListingJsonShapeError("trailing JSON data")


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
        try:
            _validate_listing_json_shape(buffered_body)
        except _ListingJsonShapeError:
            response = JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={"detail": "Listing moderation request has invalid JSON structure."},
            )
            await response(scope, receive, send)
            return
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


def _fit_listing_model_input(
    title: str,
    description: str,
    images_base64: list[str],
    policy_signals: list[str],
) -> tuple[str, list[str], list[str], bool]:
    model_description = description[:_MAX_MODEL_DESCRIPTION_CHARS]
    model_images = list(images_base64[:_MAX_MODEL_IMAGES])
    model_policy_signals = _budget_policy_signals(policy_signals)

    def fits(candidate_description: str) -> bool:
        return (
            estimate_listing_context_tokens(
                title,
                candidate_description,
                model_images,
                model_policy_signals,
            )
            <= _LISTING_MODEL_CONTEXT_TOKENS
        )

    # Images are removed first while visual-token cost is unproven; their
    # omission is surfaced below and always forces manual_review.
    while model_images and not fits(""):
        model_images.pop()
    while model_policy_signals and not fits(""):
        model_policy_signals.pop()
    if not fits(""):
        return "", [], [], False
    if fits(model_description):
        return model_description, model_images, model_policy_signals, True

    low = 0
    high = len(model_description)
    while low < high:
        middle = (low + high + 1) // 2
        if fits(model_description[:middle]):
            low = middle
        else:
            high = middle - 1
    return model_description[:low], model_images, model_policy_signals, True


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
    (
        description_for_model,
        images_for_model,
        model_policy_signals,
        model_context_fits,
    ) = _fit_listing_model_input(
        request.title,
        request.description,
        request.images_base64,
        canonical_signals,
    )
    input_description_chars = request.effective_source_description_chars
    input_image_count = request.effective_source_image_count
    description_truncated = input_description_chars > len(description_for_model)
    images_omitted = input_image_count - len(images_for_model)
    policy_signals_omitted = len(canonical_signals) - len(model_policy_signals)

    if not model_context_fits:
        from .contracts import ModelVerdict

        verdict = ModelVerdict(
            decision="manual_review",
            reason="El anuncio excede el contexto local seguro y requiere revisión humana.",
            confidence=0.0,
            flags=[],
        )
        latency_ms = 0
    else:
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
