from __future__ import annotations

import asyncio
import json

import pytest
from fastapi.testclient import TestClient

import mercasto_ai.main as gateway_main
from mercasto_ai.main import ListingRequestBoundaryMiddleware, app


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


def test_real_app_returns_413_when_actual_body_exceeds_understated_content_length(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "contract-secret")
    monkeypatch.setattr(gateway_main, "_MAX_LISTING_REQUEST_BODY_BYTES", 8)
    client = TestClient(app)

    response = client.post(
        "/v1/moderation/listing",
        content=b'{"title":"123456789"}',
        headers={
            "X-Mercasto-Internal-Token": "contract-secret",
            "Content-Type": "application/json",
            "Content-Length": "1",
        },
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "Listing moderation request body is too large."


def test_real_app_rejects_expansive_policy_structure_before_fastapi_materializes_it(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "contract-secret")
    client = TestClient(app)
    payload = {
        "title": "fixture",
        "description": "safe",
        "images_base64": [],
        "policy_signals": [{} for _ in range(10_000)],
    }
    encoded = json.dumps(payload, separators=(",", ":")).encode()
    assert len(encoded) < gateway_main._MAX_LISTING_REQUEST_BODY_BYTES

    response = client.post(
        "/v1/moderation/listing",
        content=encoded,
        headers={**{"X-Mercasto-Internal-Token": "contract-secret"}, "Content-Type": "application/json"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Listing moderation request has invalid JSON structure."
