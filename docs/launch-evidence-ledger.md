# Launch evidence ledger

Use this ledger to decide whether Mercasto is ready for soft launch and public launch. A gate is not complete until evidence is attached in the linked issue or recorded in this file.

## Rule

`verify:quick` proves production health. It does not approve public launch.

Public launch requires:

- all P0 blockers closed or explicitly risk-accepted in writing;
- `npm run verify:launch` passing;
- Playwright public smoke passing;
- soft-launch 48-hour monitoring completed without Sev1/Sev2 incidents.

## Evidence index

| Gate | Status | Evidence owner | Evidence location |
| --- | --- | --- | --- |
| Production health | Green last verified | Ops | issue #262 or latest server output |
| Direct 80/443 ownership | Guarded | Ops | issue #261, `smoke:port-ownership` |
| Env readiness | Open | Ops | `smoke:env-readiness` output |
| SMS readiness | Deferred safely | Ops/Product | issue #260, `smoke:sms-launch-mode` |
| Auth/account E2E | Green locally | QA/Product | isolated launch E2E: 16/16 |
| Ads lifecycle E2E | Green locally | QA/Product | isolated launch E2E: 12/12 |
| Payments/webhooks | Green locally | Ops/Payments | isolated launch E2E: 8/8; backend PHPUnit coverage |
| Category seed/fresh DB | Blocked | Backend/Data | issue #266 |
| Restore/rollback/alerts | Blocked | Ops | issue #267 |
| Security pass | Blocked | Security/Ops | issue #268 |
| Legal/business | Blocked | Founder/Ops | issue TBD |
| SEO/AEO | Open | Growth/Ops | issue TBD |
| Performance/Lighthouse | Open | Frontend/Ops | issue TBD |
| Soft launch monitoring | Not started | Ops/Product | `docs/soft-launch-48h-monitoring-plan.md` |

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

## Public launch decision log

Add final go/no-go note here or in a launch issue.

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
- `verify:launch` fails;
- SMS readiness is not ready;
- payment webhook evidence is missing;
- auth/account E2E evidence is missing;
- backup restore/rollback evidence is missing;
- security pass evidence is missing;
- secrets or stack traces are found in public output;
- frontend loses ownership of ports `80/443` under the current non-Traefik topology.

## Fresh closure evidence — 2026-08-04

- Current production candidate: `32c42051d621bbaffb940537638ea012f16f56a6`.
- Production checks run `30872925522`: success.
- Live server `verify_quick` job `91878442546`: success.
- Strict legal readiness smoke: success.
- Public security probes: success; sensitive paths denied and internal service ports closed.
- Playwright public launch smoke: 40/40 passed across Desktop Chrome and Pixel 7.
- Self-contained isolated launch E2E: 36/36 passed in one clean run (`auth` 16/16, `ads` 12/12, `payments` 8/8).
- Backend PHPUnit suite: 59 tests / 306 assertions passed against disposable PostgreSQL/pgvector.
- Frontend lint and production build: passed.
- Static safety and local launch-contract gates: passed.
- SMS launch mode: provider unavailable in production, user-facing SMS controls deferred, endpoints fail closed.

Still required before GO: remaining security/edge evidence, operational legal owners/human review, strict production `verify:launch`, and 48-hour soft-launch monitoring.
