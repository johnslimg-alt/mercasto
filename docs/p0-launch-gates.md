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
| Env readiness | Done | Critical runtime config present and non-placeholder | `REQUIRE_ENV_READY=1 npm run smoke:env-readiness` |
| SMS OTP | **Optional** | Phone verification is optional for launch. Email verification is sufficient for core functionality. SMS provider can be configured post-launch if needed. | `npm run smoke:sms-readiness` (non-blocking) |
| Auth E2E | Done | Register, login, logout, password reset, 2FA, delete account verified | `tests/e2e/auth-flow.spec.js`, CI workflow `e2e-seller.yml` |
| Ads E2E | Done | Create/edit/delete ad, upload media, AI description, moderation, report | `tests/e2e/ads-lifecycle.spec.js`, CI workflow `e2e-seller.yml` |
| Location/search | Done | Mexico-wide state/city search, mobile/desktop, no single-city logic | MapV3 component with state/city cascading filters |
| Payments | Done | Checkout, signed webhook, duplicate webhook, failed payment, refund/manual recovery | `tests/e2e/payments.spec.js`, CI workflow `e2e-seller.yml` |
| Categories/attributes seed | Done | Fresh database gets categories and attributes from repo-controlled seed/migration | `REQUIRE_CATEGORY_DATA_READY=1 npm run smoke:category-data` (20 categories, 12 attributes) |
| Security | Done | Admin access, rate limits, uploads, webhooks, no debug text, no exposed stack traces, no secrets in logs | `npm run smoke:security`, `npm run check:static-safety` |
| Ops | Done | backup restore test, rollback drill, uptime alerts, log rotation, Docker health, Sentry alerts | `docs/ops/backup-restore-drill-report.md` (RTO 4m 12s, completed May 22, 2026) |

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
npm run smoke:sms-readiness  # SMS is optional, non-blocking
npm run verify:launch
```

Expected launch-ready result:

```text
launch env readiness smoke OK
VERIFY_EXIT=0
```

## Non-negotiable safety rules

- Never commit `.env` or provider secrets.
- Never print secrets in CI or smoke output.
- Never re-enable host-level Traefik for `mercasto.com` unless issue #261 is completed.
- Always run migrations inside `mercasto_backend_container`, not directly on the host.
- Treat `verify:quick` as production health only, not launch approval.
