# Launch evidence ledger

Use this ledger to decide whether Mercasto is ready for soft launch and public launch. A gate is not complete until evidence is attached in the linked issue or recorded in this file.

## Rule

`verify:quick` proves production health. It does not approve public launch.

Public launch requires:

- all P0 blockers closed or explicitly risk-accepted in writing;
- `npm run verify:launch` passing;
- Playwright public smoke passing;
- soft-launch 48-hour monitoring completed without Sev1/Sev2 incidents.

## Current launch status

**NO-GO.**

Current hard execution blocker:

- #282 — the Actions runner offers the expected live-gate ED25519 key, but the production server rejects that offered key before current production `verify_quick` evidence can be captured. This is currently narrowed to server-side SSH authorization, root-login, account policy, or authorized-key configuration.

Current open P0 evidence blockers:

- #260 — SMS readiness.
- #225 — SMS OTP delivery/user-flow smoke.
- #263 — auth/account E2E coverage.
- #264 — ads lifecycle E2E coverage.
- #265 — payments E2E and webhook recovery.
- #269 — legal and business readiness.
- #272 — master launch go/no-go tracker.
- #273 — third-party AI evidence validation.
- #287 — security, privacy and anti-abuse hardening.

Current P1 / public marketing / launch-quality gates:

- #270 — SEO and AEO readiness.
- #271 — Lighthouse and performance baseline.
- #286 — production UI polish and Spanish classifieds consistency.
- #289 — stale open PR triage before launch cleanup.

Closed but conditional/stale evidence gates:

- #262 — production sync evidence exists for an older commit; fresh current `VERIFY_EXIT=0` is still required.
- #266 — category attribute seeder exists, but fresh current Docker-based category data smoke output is still required for final GO evidence.
- #267 — restore/rollback evidence exists, but fresh current backup/rollback/alert posture evidence is still required.
- #268 — older security evidence exists, but #287 supersedes final security/privacy/anti-abuse readiness.

## Evidence index

| Gate | Status | Evidence owner | Evidence location |
| --- | --- | --- | --- |
| Production health / live gate | Blocked by server-side SSH key rejection | Ops | #282, #288, Production checks artifact `7259667613` |
| Direct 80/443 ownership | Open | Ops | #261, `smoke:port-ownership` |
| Production sync after autonomous commits | Conditional / stale | Ops | #262 plus fresh current server output required |
| Env readiness | Open | Ops | `smoke:env-readiness` output |
| SMS readiness | Blocked | Ops/Product | #260 |
| SMS OTP delivery/user flow | Blocked | QA/Product | #225 |
| Auth/account E2E | Blocked | QA/Product | #263 |
| Ads lifecycle E2E | Blocked | QA/Product | #264 |
| Payments/webhooks | Blocked | Ops/Payments | #265 |
| Category seed/fresh DB | Conditional / needs fresh output | Backend/Data | #266, `smoke:category-data` |
| Restore/rollback/alerts | Conditional / needs fresh output | Ops | #267, `smoke:backup-freshness` |
| Security pass | Conditional / superseded by #287 | Security/Ops | #268, #287 |
| Security/privacy/anti-abuse | Blocked | Security/Ops | #287 |
| Legal/business | Blocked | Founder/Ops | #269 |
| SEO/AEO | Open | Growth/Ops | #270 |
| Performance/Lighthouse | Open | Frontend/Ops | #271 |
| UI polish / Spanish consistency | Open | Frontend/Ops | #286 |
| Third-party AI evidence validation | Blocked | Ops | #273 |
| Master launch decision | Blocked | Ops/Founder | #272 |
| Soft launch monitoring | Not started | Ops/Product | `docs/soft-launch-48h-monitoring-plan.md` |
| Stale PR triage | Open hygiene | Ops | #289 |

## Required command evidence

Record outputs without secrets.

```bash
cd /var/www/mercasto || exit 1
curl -k -sS -o /dev/null -w 'UP=%{http_code}\n' https://mercasto.com/up
bash scripts/server-operator.sh verify_quick; echo "VERIFY_EXIT=$?"
REQUIRE_ENV_READY=1 npm run smoke:env-readiness
REQUIRE_CATEGORY_DATA_READY=1 npm run smoke:category-data
REQUIRE_SMS_READY=1 npm run smoke:sms-readiness
npm run e2e:public:ci
npm run verify:launch
```

Additional issue-specific evidence:

```bash
REQUIRE_BACKUP_FRESHNESS=1 npm run smoke:backup-freshness
REQUIRE_PORT_OWNERSHIP=1 npm run smoke:port-ownership
npm run smoke:seo
npm run smoke:security
npm run smoke:public-manifests
npm run smoke:route-audit
npm run check:static-safety
```

## Public launch decision log

Add final go/no-go note here or in #272.

Template:

```text
Date/time UTC:
Decision: GO / NO-GO
Approver:
Production commit:
UP:
VERIFY_EXIT:
verify:launch:
Playwright public smoke:
Open P0 blockers:
Accepted risks:
Rollback commit/path:
Notes:
```

## Stop conditions

Public launch must stop if any of these are true:

- `UP` is not `200`;
- `VERIFY_EXIT` is not `0`;
- the live gate cannot authenticate and capture current `/var/www/mercasto` output;
- `verify:launch` fails;
- SMS readiness is not ready;
- payment webhook evidence is missing;
- auth/account E2E evidence is missing;
- ads lifecycle E2E evidence is missing;
- backup restore/rollback evidence is missing;
- current security/privacy/anti-abuse evidence is missing;
- legal/business readiness is missing;
- category/fresh database proof is missing;
- third-party AI evidence validation remains open;
- secrets or stack traces are found in public output;
- frontend loses ownership of ports `80/443` under the current non-Traefik topology;
- public UI/marketing starts before #272 is resolved as GO.
