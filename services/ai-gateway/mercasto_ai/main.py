from __future__ import annotations

import base64
import binascii
import hmac
import os
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, status

from .contracts import ModerationRequest, ModerationResponse, normalize_verdict
from .ollama import OllamaModerationClient, OllamaUnavailable

app = FastAPI(
    title="Mercasto AI Gateway",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
)

_MAX_DECODED_IMAGE_BYTES = 4 * 1024 * 1024


def get_ollama_client() -> OllamaModerationClient:
    return OllamaModerationClient(
        base_url=os.getenv("OLLAMA_BASE_URL", "http://ollama:11434"),
        model=os.getenv("OLLAMA_VISION_MODEL", "qwen3-vl:4b-instruct"),
        timeout_seconds=float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "90")),
    )


def require_internal_token(
    token: Annotated[str | None, Header(alias="X-Mercasto-Internal-Token")] = None,
) -> None:
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


InternalAuth = Annotated[None, Depends(require_internal_token)]
OllamaClient = Annotated[OllamaModerationClient, Depends(get_ollama_client)]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "mercasto-ai-gateway"}


@app.post("/v1/moderation/image", response_model=ModerationResponse)
async def moderate_image(
    request: ModerationRequest,
    _auth: InternalAuth,
    client: OllamaClient,
) -> ModerationResponse:
    try:
        decoded = base64.b64decode(request.image_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="image_base64 must contain valid base64 data.",
        ) from exc

    if len(decoded) > _MAX_DECODED_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Decoded image exceeds the internal moderation limit.",
        )

    try:
        verdict = await client.moderate(request.context, request.image_base64)
    except OllamaUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Local AI moderation is unavailable.",
        ) from exc

    return normalize_verdict(verdict)
