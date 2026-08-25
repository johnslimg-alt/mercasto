from __future__ import annotations

import asyncio

import pytest

import mercasto_ai.main as gateway_main
from mercasto_ai.main import ListingRequestBoundaryMiddleware


def test_listing_request_boundary_counts_actual_bytes_when_header_understates_body(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "contract-secret")
    monkeypatch.setattr(gateway_main, "_MAX_LISTING_REQUEST_BODY_BYTES", 8)
    incoming = [
        {"type": "http.request", "body": b"12345", "more_body": True},
        {"type": "http.request", "body": b"67890", "more_body": False},
    ]
    sent: list[dict[str, object]] = []

    async def downstream(scope: dict[str, object], receive: object, send: object) -> None:
        del scope, send
        while True:
            message = await receive()  # type: ignore[operator]
            if not message.get("more_body", False):
                return

    async def receive() -> dict[str, object]:
        return incoming.pop(0)

    async def send(message: dict[str, object]) -> None:
        sent.append(message)

    scope: dict[str, object] = {
        "type": "http",
        "method": "POST",
        "path": "/v1/moderation/listing",
        "headers": [
            (b"x-mercasto-internal-token", b"contract-secret"),
            (b"content-length", b"1"),
        ],
    }
    middleware = ListingRequestBoundaryMiddleware(downstream)  # type: ignore[arg-type]

    asyncio.run(middleware(scope, receive, send))  # type: ignore[arg-type]

    assert sent[0]["type"] == "http.response.start"
    assert sent[0]["status"] == 413
