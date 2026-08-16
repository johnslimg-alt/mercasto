# Mercasto: gradual Python migration

## Decision

Mercasto will use a strangler migration instead of a full rewrite. Laravel remains the source of truth for authentication, authorization, transactional marketplace data, payments, public API compatibility, and migrations until an individual domain proves that Python is materially better and reaches parity under production-like tests.

Python is introduced first for AI/media workloads because those workloads benefit from the Python ML ecosystem and are already naturally separated from the transactional application by local Ollama, queues, Redis, and Docker.

## Non-negotiable rules

1. No big-bang rewrite and no second source of truth.
2. Python services are internal-only; browsers and mobile clients continue to call the existing public API.
3. Laravel owns database writes during the early phases. Python receives explicit contracts rather than direct access to arbitrary tables.
4. User media stays on Mercasto-controlled infrastructure. AI requests go to the local Ollama service unless a future change is separately approved.
5. Every migrated capability must have a feature flag or equally fast rollback path.
6. Existing PHP behavior remains the reference contract until parity is demonstrated.
7. A migration is complete only after error rate, latency, moderation parity, security, and operational recovery are measured.

## Phase 0 — foundation (this change)

- Add an internal Python AI gateway with typed Pydantic request/response contracts.
- Preserve the current moderation decisions: only `approved` with confidence >= 0.90 is publishable.
- Require a service-to-service credential before any model work.
- Validate payload shape and base64 before local Ollama is invoked.
- Add Python lint, tests, compile checks, and image build in CI.
- Do not add the service to production Compose and do not route live requests to it yet.

## Phase 1 — shadow parity

- Add the Python container to Compose on the private Docker network only.
- Laravel remains authoritative and continues calling its current `LocalAiClient` path.
- For a bounded sample, send the same already-preprocessed moderation payload to Python asynchronously and record only non-sensitive comparison metadata: effective decision, confidence bucket, latency, model version, and error class.
- Never log image/base64 payloads.
- Require >= 99.9% contract compatibility for deterministic normalization and investigate semantic model-decision differences before enabling traffic.

## Phase 2 — first live capability

Move public avatar/logo/business-banner moderation behind a feature flag:

`Laravel validation/storage -> Python internal moderation -> local Ollama -> Laravel decision/storage`

Laravel keeps authentication, rate limiting, file lifecycle, and storage ownership. If the flag is disabled, rollback is immediate to the proven PHP path.

## Phase 3 — listing media moderation

After Phase 2 is stable, migrate preprocessing/orchestration for listing images and video frames. Keep listing state transitions and moderation audit records in Laravel initially. Python may later own frame extraction and image preprocessing because those libraries are substantially stronger in Python.

## Phase 4 — additional good Python candidates

Candidates are evaluated independently rather than migrated automatically:

- search/ranking and embeddings;
- recommendation experiments;
- fraud/anomaly scoring;
- analytics pipelines and offline jobs;
- media transformations;
- AI-assisted classification/extraction;
- high-volume integration workers where async Python measurably reduces complexity or cost.

## Areas that should stay in Laravel unless measurements justify a move

- login/session/Sanctum compatibility;
- permissions and admin authorization;
- payments and billing state;
- core listing/user CRUD;
- transactional database workflows;
- existing public API endpoints that have no performance or maintainability problem.

Rewriting these areas merely to make the stack uniform creates migration risk without a corresponding product benefit.

## Per-capability promotion gates

Before switching any live path from PHP to Python, require all of the following:

- contract tests cover success, rejection, malformed input, timeout, and dependency outage;
- no user data is written by both implementations;
- rollback can be executed without a schema rollback;
- p95 latency is no worse than the current path or has a documented reason;
- error/timeout rate is within the existing SLO;
- resource usage fits the VPS budget under concurrent load;
- security review confirms the Python service is not publicly exposed;
- logs contain no uploaded media, credentials, tokens, or sensitive document content;
- production shadow comparison has no unexplained decision drift.

## Target architecture

The intended end state is a polyglot Mercasto, not "Python everywhere":

- React: client UI;
- Laravel: public API, auth, transactional domain, database migrations and orchestration;
- Python: AI/ML, media and data-heavy services where its ecosystem is an advantage;
- PostgreSQL/pgvector: single durable source of truth;
- Redis: queues/cache/coordination;
- Ollama: local inference;
- Docker network: private service-to-service communication.

This lets Mercasto migrate capability-by-capability while keeping the currently working product deployable after every merge.
