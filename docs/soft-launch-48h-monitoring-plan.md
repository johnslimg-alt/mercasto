# Soft launch and 48-hour monitoring plan

This plan starts only after all P0 launch blockers are closed and `npm run verify:launch` passes.

## Entry criteria

Do not start soft launch until all are true:

- `UP=200`.
- `npm run verify:quick` passes.
- `npm run verify:launch` passes.
- SMS readiness is `ready`.
- Env readiness is `ready`.
- Category data readiness is `ready`.
- Public Playwright smoke passes.
- P0 launch-blocker issues are closed or explicitly accepted with written risk.

## Soft launch scope

- Start with a limited invite-only user group.
- Do not start public marketing during soft launch.
- Do not enable major new infrastructure changes during the 48-hour window.
- Keep direct frontend ownership of ports `80/443` unless issue #261 is completed.

## 48-hour monitoring checklist

Record checks at launch, +6h, +24h and +48h.

| Area | Check | Evidence |
| --- | --- | --- |
| Public health | `/up` returns 200 | curl output |
| Smoke gates | `npm run verify:quick` passes | command output |
| Browser smoke | Playwright public smoke passes | GitHub Actions artifact |
| Error monitoring | Sentry errors reviewed | screenshot/summary |
| Logs | Docker and Laravel logs reviewed for exceptions/secrets | summary |
| Payments | checkout/webhook errors reviewed | provider/app summary |
| SMS | OTP send/check errors reviewed | provider/app summary |
| Search/listings | listing create/search/detail checked | manual or E2E evidence |
| Performance | homepage/listing/publish/account checked for slow responses | summary |
| Abuse | auth/OTP/reporting rate limit events reviewed | summary |
| Backups | latest backup freshness verified | command output |

## Commands

```bash
cd /var/www/mercasto || exit 1
curl -k -sS -o /dev/null -w 'UP=%{http_code}\n' https://mercasto.com/up
bash scripts/server-operator.sh verify_quick; echo "VERIFY_EXIT=$?"
npm run e2e:public:ci
bash scripts/backup-freshness-smoke.sh
```

## Exit criteria

Soft launch may progress to public launch only when:

- no Sev1/Sev2 incidents in 48 hours;
- payment and SMS errors are understood and acceptable;
- no secret/log disclosure is found;
- no repeated frontend/backend container restarts;
- support process is ready;
- launch owner records a final go/no-go note.

## Rollback trigger examples

- public health endpoint fails repeatedly;
- payment state corruption or double-credit risk;
- auth/account security issue;
- sensitive secret exposure;
- upload abuse or executable file exposure;
- unexplained high error rate in Sentry/logs;
- data-loss risk.
