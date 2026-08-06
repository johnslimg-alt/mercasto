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
| Production health | Green on `bb9eba24` | Ops | `docs/evidence/operator/2026-08-06/README.md`, latest `verify_quick` |
| Direct 80/443 ownership | Green/guarded | Ops | issue #261, `smoke:port-ownership` |
| Env readiness | Operational check retained | Ops | `smoke:env-readiness` |
| SMS readiness | Disabled by product decision | Ops/Product | issues #225/#260, `smoke:sms-launch-mode` |
| Auth/account E2E | Green | QA/Product | isolated launch E2E: 16/16 |
| Ads lifecycle E2E | Green | QA/Product | isolated launch E2E: 12/12 |
| Payments/webhooks | Green | Ops/Payments | isolated launch E2E: 8/8; issue #287 |
| Category seed/fresh DB | Green | Backend/Data | issue #266 |
| Restore/rollback/alerts | Green | Ops | issue #267, backup/restore drill |
| Security pass | Green | Security/Ops | issues #268/#287 |
| Legal/business | Technical green; human sign-off open | Founder/Ops | issue #269 |
| SEO/AEO | Green | Growth/Ops | issue #270 |
| Performance/Lighthouse | Green baseline | Frontend/Ops | issue #271, `docs/perf/lighthouse-report.md` |
| UI visual QA | Green | Frontend/QA | issue #286, PRs #485/#486 |
| Managed CDN/WAF | Open before broad paid scale | Security/Ops | issue #408 |
| GitHub Actions lane | Degraded/intermittent | Ops | issue #183 |
| Final launch decision/monitoring | Open | Ops/Product | issue #272 |

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
- SMS/phone functionality is unexpectedly enabled without a new product decision and readiness review;
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

Still required before unrestricted broad paid scale: human legal/business sign-off (#269), a compatible managed CDN/WAF decision (#408), the final monitoring/decision record (#272), and resolution or explicit acceptance of the intermittent Actions lane (#183).


## Operator closure evidence — 2026-08-06

- Production commit `bb9eba246e861ca4677202cd6f9ac527bc026278`: clean checkout, 11/11 services healthy/running, `/up=ok`, `verify_quick` exit 0.
- Reverb secure edge: real TLS WebSocket handshake returned `101 Switching Protocols` with `Upgrade: websocket` on port 443.
- SSL monitoring: daily monitor and expiry logs current; certbot timer enabled/active; current Mercasto certificate had 35 days remaining.
- Database agent role: `mercasto_readonly` read 57 granted objects; a schema write was denied and no probe object remained.
- Historical public MCP SSE claim was disproved and retired; the dormant ignored write-capable bridge was moved to root-only quarantine.
- Full sanitized evidence: `docs/evidence/operator/2026-08-06/README.md` and `report.json`.
- UI evidence: 33 screenshots total across production anonymous and isolated authenticated desktop/tablet/mobile states, issues #286 / PRs #485–#486.

Remaining constraints are #269, #408, #183 and the final decision/monitoring record in #272.
