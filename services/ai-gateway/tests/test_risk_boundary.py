from __future__ import annotations

from fastapi.testclient import TestClient

from mercasto_ai.combined import app


def test_risk_boundary_authenticates_before_reading_large_body(monkeypatch) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "risk-boundary-secret")
    client = TestClient(app)

    response = client.post("/v1/risk/batch", content=b"x" * (129 * 1024))

    assert response.status_code == 401


def test_risk_boundary_rejects_large_authenticated_body_before_json_parsing(monkeypatch) -> None:
    monkeypatch.setenv("MERCASTO_AI_INTERNAL_TOKEN", "risk-boundary-secret")
    client = TestClient(app)

    response = client.post(
        "/v1/risk/batch",
        content=b"x" * (129 * 1024),
        headers={
            "Content-Type": "application/json",
            "X-Mercasto-Internal-Token": "risk-boundary-secret",
        },
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "Risk request body is too large."
