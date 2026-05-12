# Mercasto production verification commands

This is the common verification runbook for CEO/Major, HR/agent coordinator, Claude Code/Codex agents, and server operators.

## One-command server gates

Run from any shell that can see the Mercasto checkout. The script resolves the project directory automatically when possible.

```bash
bash scripts/server-gate.sh status
bash scripts/server-gate.sh quick
bash scripts/server-gate.sh full
bash scripts/server-gate.sh cache
bash scripts/server-gate.sh seo
bash scripts/server-gate.sh security
```

## Gate modes

| Mode | Command | Use when | What it runs |
| --- | --- | --- | --- |
| Status | `bash scripts/server-gate.sh status` | Before changing production or reporting state. | Git status, latest commit, Docker Compose service status. |
| Quick | `bash scripts/server-gate.sh quick` | After ordinary safe changes. | `npm run verify:quick`. |
| Full | `bash scripts/server-gate.sh full` | Before or after production-impacting changes. | `npm run gate:prod` and `npm run verify:prod`. |
| Cache | `bash scripts/server-gate.sh cache` | After cache, PWA, service-worker, frontend delivery, or header changes. | Cache policy scan and homepage cache-header smoke. |
| SEO | `bash scripts/server-gate.sh seo` | After SEO, AEO, copy, or metadata changes. | SEO smoke, homepage cache-header smoke, public copy scan. |
| Security | `bash scripts/server-gate.sh security` | After auth, payment, public exposure, or sensitive-path changes. | Security smoke, payment-retention scan, cache-policy scan. |

## Direct npm gates

Use these when running from the repository root:

```bash
npm run check:scripts
npm run check:compose
npm run check:payment-retention
npm run check:cache-policy
npm run smoke:cache-headers
npm run verify:quick
npm run verify:prod
npm run gate:prod
```

## Baseline pre-change check

```bash
git rev-parse --short HEAD
git status --short
docker compose -f docker-compose.yml -f docker-compose.override.yml config >/tmp/mercasto-compose-check.yml
docker compose -f docker-compose.yml -f docker-compose.override.yml ps
```

Pass criteria:

- Git working tree is clean or only expected generated artifacts are present.
- Compose base plus override config renders successfully.
- Core services are up and healthy before any production-impacting change.

## Public endpoint checks

The quick smoke already covers these, but direct checks are useful during incidents:

```bash
curl -I https://mercasto.com/up
curl -I https://mercasto.com/
curl -I https://mercasto.com/api/categories
curl -I 'https://mercasto.com/api/ads?page=1'
curl -I https://mercasto.com/horizon
curl -I https://mercasto.com/vendor/horizon
```

Pass criteria:

- `/up` returns 200.
- `/` returns 200, 301, or 302.
- public APIs return a controlled non-5xx response.
- Horizon paths return 403, 404, or 410.

## Merge and deploy policy

- Docs-only changes may proceed after review when they do not alter runtime behavior.
- Script and gate changes require shell syntax validation and the relevant npm gate.
- Frontend changes require build and quick verification.
- Backend, auth, payment, security, routing, cache, or infra changes require the full gate or an explicitly narrower gate listed above.
- If a gate fails, stop related merges, capture the first actionable error, fix in the smallest patch, and rerun the failed gate.

## Confidential-data rule

Do not publish private operational values, raw private payloads, production credentials, or account-specific artifacts in issues, comments, docs, or generated reports.
