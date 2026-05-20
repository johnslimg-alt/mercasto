# Mercasto API Contract Roadmap

Mercasto currently has production API routes and smoke tests, but no explicit OpenAPI or Swagger contract in the repository. This document defines the safe path toward an agent-ready API contract without exposing secrets or expanding runtime risk.

## Why this matters

A maintained API contract allows Mercasto to:

- document public and authenticated API behavior;
- generate safer API clients;
- power read-only MCP API navigation later;
- run contract-aware smoke checks;
- reduce accidental endpoint regressions during autonomous work.

## Current state

- Public and authenticated routes are implemented in Laravel.
- Smoke scripts validate selected production routes.
- No `openapi.yaml`, `swagger.json`, Redoc, Scribe, or l5-swagger contract is present in the repository.
- HAPI MCP Registry includes OpenAPI MCP servers, but they should not be connected until Mercasto has a maintained contract.

## Initial scope

Start with a minimal manually maintained contract for stable public endpoints only:

1. `GET /api/categories`
2. `GET /api/ads`
3. `GET /api/ads/{id}`
4. `GET /api/search/suggestions`
5. `GET /api/states/counts`
6. `GET /api/users/{id}/profile`
7. `GET /api/users/{id}/business-profile`
8. `GET /api/auth/providers`

Do not include authenticated write routes, admin routes, payment routes, webhooks, OAuth callbacks, or agent endpoints in the first contract.

## Safety rules

- Never document secrets, tokens, credentials, or private environment values.
- Do not expose admin-only or internal agent endpoints in public documentation.
- Keep payment and webhook examples sanitized.
- Treat the OpenAPI file as public documentation.
- Add contract checks incrementally through small PRs.

## Acceptance criteria for the first contract PR

- Add `docs/openapi.public.yaml`.
- Cover only stable public read endpoints.
- Include response status codes and basic schemas.
- Add a syntax validation script that does not require external credentials.
- Keep existing production routes unchanged.

## Future MCP integration

After the public OpenAPI contract exists and is validated, evaluate these read-only MCP candidates from HAPI MCP Registry:

- `io.github.mgaruccio/openapi-navigator`
- `io.github.Docat0209/openapi`
- `io.github.mayorandrew/openapi-dynamic`

Use read-only discovery and local/staging URL testing first. Do not allow OpenAPI MCP tools to call authenticated, admin, payment, or destructive endpoints until a separate review is complete.
