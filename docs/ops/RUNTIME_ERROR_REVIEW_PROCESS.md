# Mercasto runtime error review process

This process defines how CEO/Major, QA, and implementation agents review production runtime errors without waiting for founder coordination.

## Objective

Catch production regressions quickly, classify them consistently, and decide whether to continue, rollback, or open a focused fix lane.

## Inputs

Use whichever observability source is available for the current environment:

- Sentry project events and release regressions;
- container logs for frontend/backend/reverb/worker/scheduler;
- GitHub Actions deploy and production-checks runs;
- public smoke results from `npm run verify:quick`;
- user-facing reports from chat/support.

Do not paste secrets, bearer tokens, cookies, full webhook payloads, or personal data into issues or PR comments.

## Review cadence

| Time | Action | Owner |
| --- | --- | --- |
| After every deploy | Check deploy workflow, production checks, and `npm run verify:quick`. | CEO/Major operator |
| Daily during active build | Review top new frontend/backend runtime errors. | QA/Security agent |
| After payment/auth/security changes | Review related logs immediately after gate. | Backend/security agent |
| After UI/SEO changes | Review public routes, metadata, and console-breaking failures. | Frontend/SEO agent |

## Severity model

| Severity | Meaning | Required action |
| --- | --- | --- |
| P0 | Site down, payment/auth broken, private data leak, admin/security exposure. | Stop auto-merge, rollback or hotfix, run `npm run gate:prod`. |
| P1 | Core flow degraded: listing, publish, search, webhook side effect, runner/deploy instability. | Open focused issue/PR, run targeted smoke and `npm run verify:quick`. |
| P2 | Non-blocking UX/runtime issue with workaround. | Batch into normal agent lane. |
| P3 | Cosmetic/log-noise/docs-only. | Fix opportunistically. |

## Triage checklist

For every runtime error cluster:

1. Identify first-seen time and matching commit/deploy.
2. Determine affected surface: frontend, backend API, worker, scheduler, Reverb, payment, auth, SEO.
3. Check whether public smoke is green:
   ```bash
   npm run verify:quick
   ```
4. If payment/auth/security is involved, escalate at least to P1.
5. If a secret or personal data appears in logs, redact immediately and create a security issue without copying the raw value.
6. Decide one action:
   - no-op with note;
   - open focused issue;
   - hotfix;
   - rollback;
   - add missing smoke coverage.

## Auto-merge stop rules

Disable or avoid auto-merge when any of these are true:

- New P0 or unresolved P1 after the latest deploy.
- Deploy workflow failed or production checks failed.
- `npm run verify:quick` is red.
- Payment/auth/admin/security files changed without green `npm run gate:prod`.
- Runtime error rate clearly increased after a PR.
- A rollback is in progress.

## Issue template for runtime errors

```md
## Runtime error summary

Severity: P0/P1/P2/P3
First seen:
Last known good commit:
Suspected commit/deploy:
Surface:

## Evidence

- Redacted error message:
- Affected route/job/container:
- Smoke/gate result:

## Decision

- [ ] no-op
- [ ] focused fix
- [ ] rollback
- [ ] add smoke coverage

## Acceptance

- Error no longer reproduces or is reduced to acceptable noise.
- Relevant smoke/gate is green.
- No secrets or private data copied into the issue.
```

## Rollback decision

Rollback is preferred over forward-fix when:

- the breaking commit is known;
- the issue affects public availability, payment, auth, or privacy;
- a safe fix is not obvious in one small patch;
- public smoke remains red after one targeted fix attempt.

Forward-fix is acceptable when:

- the bug is isolated;
- the patch is small and reversible;
- the affected surface has a direct smoke check;
- rollback would remove other important production fixes.

## Agent operating rules

- Keep runtime-error fixes atomic.
- Add or update a smoke check when the bug was preventable.
- Link every runtime fix to a commit, PR, or issue.
- Do not perform broad refactors during incident response.
- Do not ask the founder to classify routine runtime errors; use this policy.
