# P0 launch gates

This checklist defines what must be true before public launch/marketing. `verify:quick` only means the live production service is healthy. Public launch requires `verify:launch` plus human/commercial readiness items that cannot be represented as code without secrets or payment-provider access.

## Gate status model

- **Done** — automated gate exists and recently passed on production.
- **Guarded** — automated guard exists, but final commercial/runtime data still required.
- **Blocked** — must be completed before public launch.
- **Manual evidence required** — needs recorded screenshot/log/provider confirmation.

## P0 blockers

| Area | Status | Launch requirement | Evidence |
| --- | --- | --- | --- |
| Production health | Done | `UP=200` and `VERIFY_EXIT=0` | `bash scripts/server-operator.sh verify_quick` |
| Direct 80/443 ownership | Done | `mercasto_frontend_container` owns 80/443; Traefik not active for `mercasto.com` | `npm run smoke:port-ownership` |
| Env readiness | Guarded | Critical runtime config present and non-placeholder | `REQUIRE_ENV_READY=1 npm run smoke:env-readiness` |
| SMS OTP | Blocked | Provider configured with production-safe values | Issue #260, `REQUIRE_SMS_READY=1 npm run smoke:sms-readiness` |
| Auth E2E | Blocked | Register, login, logout, password reset, 2FA, delete account verified | Playwright/manual evidence |
| Ads E2E | Blocked | Create/edit/delete ad, upload media, AI description, moderation, report | Playwright/manual evidence |
| Location/search | Guarded | Mexico-wide state/city search, mobile/desktop, no single-city logic | `location-search-gate.sh`, Playwright smoke |
| Payments | Blocked | Checkout, signed webhook, duplicate webhook, failed payment, refund/manual recovery | Provider sandbox/live evidence |
| Categories/attributes seed | Blocked | Fresh database gets categories and attributes from repo-controlled seed/migration | migration/seed smoke evidence |
| Security | Guarded | Admin access, rate limits, uploads, webhooks, no debug text, no exposed stack traces, no secrets in logs | `smoke:security`, static gates, OWASP pass |
| Ops | Blocked | backup restore test, rollback drill, uptime alerts, log rotation, Docker health, Sentry alerts | recorded drill output |

## P1 soft-launch gates

| Area | Requirement |
| --- | --- |
| Browser regression | Playwright smoke/regression for mobile, tablet and desktop |
| Performance | Lighthouse or equivalent audit for homepage, listing detail, publish, account/dashboard |
| UI polish | header, theme/language switcher, category cards, dark-mode contrast |
| Legal/business | terms, privacy, cookies, refund/payment policy, moderation policy, support process |
| SEO/AEO | sitemap, robots, OG images, category/state landing pages, Google indexing basics |

## Correct release order

1. Close P0 env/payment/auth/ads/location/security blockers.
2. Add browser E2E smoke to CI and record baseline.
3. Run soft launch with a limited group.
4. Watch Sentry, logs and payments for 48 hours.
5. Only then start public launch and marketing.

## Required final command sequence

```bash
cd /var/www/mercasto || exit 1
docker exec mercasto_backend_container php artisan migrate --force
REQUIRE_ENV_READY=1 npm run smoke:env-readiness
REQUIRE_SMS_READY=1 npm run smoke:sms-readiness
npm run verify:launch
```

Expected launch-ready result:

```text
sms_provider=ready
launch env readiness smoke OK
VERIFY_EXIT=0
```

## Non-negotiable safety rules

- Never commit `.env` or provider secrets.
- Never print secrets in CI or smoke output.
- Never re-enable host-level Traefik for `mercasto.com` unless issue #261 is completed.
- Always run migrations inside `mercasto_backend_container`, not directly on the host.
- Treat `verify:quick` as production health only, not launch approval.
