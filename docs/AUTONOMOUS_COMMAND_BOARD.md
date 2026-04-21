# Mercasto Autonomous Command Board

## Mission
- Bring Mercasto to a production-ready state with strict milestone control, two-step critique, automated task generation, and verified fixes.

## Leadership
- Supervisor: main coordinator, risk owner, final decision maker.
- Milestone Inspector: independent checkpoint reviewer.
- Project Manager: task creation, ownership, dependencies, ETA tracking.

## Checkpoints
- Scope Locked
- Research Locked
- Design Approved
- Critique Passed
- Implementation Complete
- Tests Green
- Release Ready
- Post-Release Verification

## Two-Step Critique Rule
1. Design Critique
2. Security/Quality Critique

No implementation moves forward until both critiques are complete and follow-up tasks are created.

## Current Repo Risks
- Dirty worktree across backend, frontend, routes, seeders, and package lock.
- Many scratch and deployment helper files exist at repo root.
- Frontend/helper files appear in unusual locations and may indicate repo hygiene drift.
- Production deploy safety depends on hard resets in CI, so uncommitted local work is easy to lose.
- Local infra data directories exist in repo root and should not be treated as source.

## Initial Priority Queue

### P0 Critical
- Fix reset-password frontend/backend contract mismatch.
- Verify provider detection fix reaches production and Google auth status is correct.
- Audit auth/session stability, navigation/back behavior, and unexpected app exits.
- Verify search/location flow across frontend state, request params, and backend filtering.
- Confirm deployment workflow is safe, reproducible, and not deleting required files.

### P1 High
- Desktop categories single-row horizontal scroll.
- Mobile location UI visibility and usability.
- Language switching reliability and persistence.
- Favicon/logo replacement and browser asset correctness.
- Horizon access policy verification and safe admin-only access.

### P2 Medium
- Repo hygiene cleanup of scratch files and misplaced artifacts.
- GraphQL/Apollo dependency decision and cleanup if unused.
- Accessibility and responsive QA pass.
- Design/content consistency pass.

## Initial Workstreams

### Workstream A: Engineering and Security
- Owner: Engineering/Security Lead
- Scope:
  - auth/session
  - provider config
  - payments/webhooks
  - admin and security risks
  - deploy/release safety

### Workstream B: UX and Product
- Owner: Design/UX Lead
- Scope:
  - location search UX
  - categories layout
  - mobile filters/location
  - language switching
  - navigation/back behavior
  - favicon/logo integration

### Workstream C: Release and Ops
- Owner: Release/Ops Lead
- Scope:
  - deploy workflow
  - docker-compose
  - Horizon
  - observability
  - repo hygiene
  - production verification gaps

## Audit Findings

### Design and UX Findings
- Critical: reset-password modal sends only `password`, while backend requires `password_confirmation`.
- High: ad/storefront navigation is stateful and not URL-safe, so browser back behavior can diverge.
- High: language switching is partial; many visible strings bypass translations.
- Medium: location search behavior is inconsistent across desktop and mobile.
- Medium: favicon/logo assets are mismatched and incomplete across HTML, manifest, and service worker.

### Release and Ops Findings
- P0: current deploy workflow performs destructive live-server cleanup and is not a safe gated CI/CD release flow.
- P0: Laravel `/up` health endpoint is not clearly routed through nginx for reliable health checks.
- P1: event/command/runtime classes are misplaced outside expected Laravel autoload locations.
- P1: repo contains secret-bearing, temporary, and runtime artifact files that should not remain in source control.
- P1: observability and release safety are only partial; image pinning and persistence are inconsistent.
- P2: Horizon access is routed but explicit backend authorization remains unverified in the repo.

## Task Format
- title
- owner
- priority
- dependencies
- ETA
- success metric
- status
- blockers

## Daily Status Format
- Done
- In progress
- Blocked
- New tasks created
- Risks
- Checkpoint status
- Escalations
- Next 3 actions

## Next 3 Actions
1. Collect the remaining engineering/security audit results.
2. Synthesize the first execution backlog with confirmed P0/P1 tasks.
3. Continue implementation on the top blocking production issues starting with auth reset and deploy safety.
