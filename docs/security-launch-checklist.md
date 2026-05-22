# Security launch checklist

This checklist turns the public launch security pass into explicit evidence requirements. It complements automated probes and should be completed before public launch/marketing.

Primary reference model: OWASP Web Security Testing Guide (WSTG), plus Mercasto-specific production gates.

## Automated gates already in repo

- `npm run smoke:security`
- `npm run smoke:public-manifests`
- `npm run smoke:route-audit`
- `npm run check:static-safety`
- `npm run check:payment-webhook-idempotency`
- `npm run check:media-upload-validation`
- `npm run smoke:port-ownership`
- `npm run smoke:env-readiness`
- `npm run smoke:sms-readiness`

## P0 security evidence required

| Area | Requirement | Evidence |
| --- | --- | --- |
| Information disclosure | No `.env`, `.git`, package manifests, lockfiles, logs, stack traces, APP_KEY or DB secrets public | `smoke:security`, Playwright public smoke |
| Authentication | Register/login/logout/password reset/2FA/delete account verified; brute-force protection present | Playwright/manual evidence, route throttles |
| Authorization | Users cannot edit/delete others' listings, profiles, payments, or admin resources | E2E/API negative tests |
| Session/cookie security | Secure session settings and CSRF/Sanctum behavior verified | `session-config-scan.sh`, browser checks |
| File upload | Media type/size/storage validation and no executable uploads | `media-upload-validation-scan.sh`, upload E2E |
| Payments/webhooks | Signed webhook required, invalid signature rejected, duplicate webhook idempotent | payment issue #265 evidence |
| Rate limiting | Auth, OTP, search, ads, AI, payments, reports and webhooks rate-limited | static routes review and runtime smoke |
| Error handling | Public UI/API never exposes stack traces or raw exceptions | Playwright public smoke, security probes |
| Admin protection | Admin routes require auth and role checks; Horizon/internal routes not public | route audit/security probes |
| Secrets/logs | No secrets in repo, browser output, Docker logs, Laravel logs or CI artifacts | manual log review |
| Dependency surface | npm/composer audit reviewed or risk accepted | recorded audit output |
| Monitoring | Sentry alerts and uptime alerts configured | issue #267 evidence |

## Required commands before launch

```bash
npm run verify:quick
REQUIRE_ENV_READY=1 npm run smoke:env-readiness
REQUIRE_SMS_READY=1 npm run smoke:sms-readiness
npm run e2e:public:ci
npm run verify:launch
```

## Manual review notes

Record evidence in the corresponding launch-blocker issues:

- Auth/account: #263
- Ads lifecycle: #264
- Payments: #265
- Category seed/fresh DB: #266
- Ops restore/rollback/alerts: #267

## Non-negotiables

- Do not commit or print secrets.
- Do not expose stack traces in production.
- Do not enable Traefik for `mercasto.com` without completing issue #261.
- Do not treat `verify:quick` as public launch approval.
