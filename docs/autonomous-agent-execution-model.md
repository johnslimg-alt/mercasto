# Autonomous agent execution model

This document turns launch work into parallel agent lanes. Agents should work without waiting for ad-hoc chat prompts, but must not bypass production safety gates.

## Global rule

Production health is not launch approval. Public launch requires closing the P0 launch blockers, passing `verify:launch`, running public Playwright smoke, and completing soft-launch monitoring.

## Control center

- Master tracker: issue #272
- P0 launch checklist: `docs/p0-launch-gates.md`
- Evidence ledger: `docs/launch-evidence-ledger.md`
- Current production state: `docs/autonomous-production-state-2026-05-22.md`

## Agent lanes

| Lane | Owner role | Issues | Primary output | Stop condition |
| --- | --- | --- | --- | --- |
| CEO/Release | Release lead | #272 | go/no-go record | any open P0 blocker without accepted risk |
| DevOps | Ops agent | #261 #262 #267 | production sync, restore, rollback, alerts evidence | `UP != 200` or `VERIFY_EXIT != 0` |
| Security | Security agent | #268 | security evidence, negative tests, dependency review | stack trace, secret exposure, auth bypass |
| Auth/Account | QA agent | #263 | Playwright/manual auth evidence | login/account flow broken |
| Listings | Product QA agent | #264 | listing lifecycle E2E evidence | create/edit/delete/media/report broken |
| Payments | Payments agent | #265 | webhook and recovery evidence | unsigned/duplicate/failure path unsafe |
| Data | Backend/data agent | #266 | fresh DB category/attribute proof | empty categories or attributes |
| Legal/Ops | Legal/business agent | #269 | policy pages and support process evidence | missing privacy/terms/support/payment policy |
| Growth | SEO/AEO agent | #270 | SEO/AEO evidence | robots/sitemap/canonical/indexing broken |
| Frontend Perf | Performance agent | #271 | Lighthouse/performance baseline | severe mobile or route performance regression |

## Required commands by lane

### DevOps

```bash
bash scripts/server-operator.sh verify_quick
bash scripts/backup-freshness-smoke.sh
```

### Launch strictness

```bash
REQUIRE_ENV_READY=1 npm run smoke:env-readiness
REQUIRE_CATEGORY_DATA_READY=1 npm run smoke:category-data
REQUIRE_SMS_READY=1 npm run smoke:sms-readiness
npm run verify:launch
```

### Browser QA

```bash
npm run e2e:public:ci
```

### Security

```bash
npm run smoke:security
npm run smoke:public-manifests
npm run smoke:route-audit
npm run check:static-safety
```

## Production safety rules

- Do not enable Traefik for `mercasto.com` unless issue #261 is completed.
- Keep `mercasto_frontend_container` owning host ports `80/443` under the current topology.
- Do not run Laravel migrations directly on the host; run inside the backend container.
- Do not print or commit secrets.
- Do not restore backups into the live production database during drills.
- After any production sync, record public health and verify output.

## Agent handoff format

Every agent must leave one concise evidence note in its issue:

```text
Agent:
Commit(s):
Commands run:
Result:
Evidence/artifact:
Open risk:
Next action:
```

## Parallel execution order

Run these lanes in parallel after repo sync:

1. DevOps restore/rollback/alerts.
2. Security pass.
3. Auth/account E2E.
4. Listings E2E.
5. Payments evidence.
6. Data/fresh DB proof.
7. Legal/business readiness.
8. SEO/AEO and performance baseline.

Release lead closes #272 only after P0 blockers are closed and soft launch monitoring completes.
