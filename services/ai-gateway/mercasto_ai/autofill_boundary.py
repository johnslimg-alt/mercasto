from __future__ import annotations

from fastapi import HTTPException, status
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from .main import _validate_internal_token

_AUTOFILL_PATH = "/v1/autofill/listing"
_MAX_AUTOFILL_REQUEST_BODY_BYTES = 4 * 1024 * 1024


class AutofillRequestBoundaryMiddleware:
    """Authenticate and cap autofill bodies before FastAPI/Pydantic parsing."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if (
            scope["type"] != "http"
            or scope.get("method") != "POST"
            or scope.get("path") != _AUTOFILL_PATH
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
                response = JSONResponse(status_code=400, content={"detail": "Invalid Content-Length header."})
                await response(scope, receive, send)
                return
            if declared_bytes < 0:
                response = JSONResponse(status_code=400, content={"detail": "Invalid Content-Length header."})
                await response(scope, receive, send)
                return
            if declared_bytes > _MAX_AUTOFILL_REQUEST_BODY_BYTES:
                response = JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={"detail": "Listing autofill request body is too large."},
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
            if received_bytes > _MAX_AUTOFILL_REQUEST_BODY_BYTES:
                response = JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={"detail": "Listing autofill request body is too large."},
                )
                await response(scope, receive, send)
                return
            chunks.append(chunk)
            if not message.get("more_body", False):
                break

        buffered_body = b"".join(chunks)
        replayed = False

        async def replay_receive() -> dict[str, object]:
            nonlocal replayed
            if replayed:
                return {"type": "http.request", "body": b"", "more_body": False}
            replayed = True
            return {"type": "http.request", "body": buffered_body, "more_body": False}

        await self.app(scope, replay_receive, send)
