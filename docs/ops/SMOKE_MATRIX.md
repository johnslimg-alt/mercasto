# Mercasto production smoke matrix

This matrix is the default CEO/agent gate for Mercasto production work. It converts routine launch-readiness checks into explicit pass/fail criteria so agents can move without asking the founder to coordinate manual QA.

## Gate commands

Run from the production checkout unless a workflow explicitly runs them in CI:

```bash
npm run verify:quick
npm run gate:prod
```

`verify:quick` is the minimum post-change gate. `gate:prod` is the pre-merge/pre-deploy gate for code that can affect runtime, payment, security, routing, SEO, or public UX.

## Script coverage map

| Area | Command | Purpose |
| --- | --- | --- |
| Shell syntax | `npm run check:scripts` | Every shell script in `scripts/` parses before any production action depends on it. |
| Compose syntax | `npm run check:compose` | Base and production override Docker Compose configs render successfully. |
| Recovery guard | `npm run check:recovery` | Recovery/protection rules are still present before deployment. |
| Payment retention | `npm run check:payment-retention` | Account deletion never physically deletes payment rows; financial/audit history is preserved. |
| Frontend build | `npm run build` | Vite production assets compile. |
| Public production smoke | `npm run smoke:prod` | Public health, homepage, categories, ads, sensitive paths, internal ports, PHP upload limits. |
| Security probes | `npm run smoke:security` | Sensitive HTTP paths and internal service ports are not exposed. |
| Listing route smoke | `npm run smoke:routes` | Listing/deep-link routes remain reachable or correctly redirected. |
| Route audit | `npm run smoke:route-audit` | Public route policy does not regress. |
| SEO/AEO audit | `npm run smoke:seo` | Public metadata, robots/sitemap, and answer-engine surfaces are reachable and sane. |
| Public copy scan | `npm run smoke:copy` | Public copy does not leak debug/internal launch language. |

## Full smoke matrix

| Check | Surface | How to verify | Pass criteria | Owner |
| --- | --- | --- | --- | --- |
| Homepage availability | `https://mercasto.com/` | `npm run smoke:prod` and `curl -I https://mercasto.com/` | HTTP 200; security headers present; no 5xx. | CEO/Major operator |
| Health endpoint | `https://mercasto.com/up` | `npm run smoke:prod` | HTTP 200. | CEO/Major operator |
| Categories API | `https://mercasto.com/api/categories` | `npm run smoke:prod` | HTTP 200 JSON; no 502/500. | Backend agent |
| Ads API | `https://mercasto.com/api/ads?page=1` | `npm run smoke:prod` | HTTP 200 JSON; pagination endpoint available even with empty catalog. | Backend agent |
| Auth providers API | `https://mercasto.com/api/auth/providers` | Manual curl or API smoke extension | HTTP 200 JSON; exposes only configured OAuth provider status, no secrets. | Backend/security agent |
| Listing canonical route | `/listing/{id}-{slug}` | `npm run smoke:routes` | Existing listing resolves; fallback test route redirects or returns expected safe status. | Frontend/backend agent |
| Legacy listing routes | `/ads/{id}`, `/ad/{id}` | `npm run smoke:routes` | Compatibility routes resolve or redirect without 404/500. | Frontend/backend agent |
| Publish flow shell | Authenticated `/api/ads` | Dedicated authenticated QA once test credentials exist | Valid authenticated ad creation succeeds; invalid uploads/fields fail with 4xx, not 5xx. | QA agent |
| Search and filters | Public listing feed/category query params | Browser/device QA or future Playwright gate | Filter state updates URL and results without blank page or API crash. | QA/Frontend agent |
| Sensitive paths | `.env`, `.git/config`, `backend/.env`, package manifests, Horizon paths | `npm run smoke:security` | 404 or closed; never 200; no source or secret disclosure. | Security agent |
| Internal ports | Ollama, Redis, Postgres, Prometheus, cAdvisor | `npm run smoke:security` | Public IP endpoints are closed/unreachable. | Security/Infra agent |
| Payment checkout config | Clip checkout route | `npm run check:payment-retention`; manual payment QA only with sandbox/live credentials | Missing credentials fail closed before payment mutation; no fake checkout success. | Payments agent |
| Payment webhook authenticity | `/api/webhooks/clip` | Code audit plus future signed fixture test | Missing/invalid signature rejected; only signed paid webhook mutates payment state. | Payments/security agent |
| Account self-delete retention | `DELETE /api/user` | `npm run check:payment-retention` | Payment rows are retained and unlinked; user/ad references are nulled, not physically deleted. | Backend/security agent |
| Admin delete retention | `DELETE /api/users/{id}` | Code audit + future integration fixture | Payment rows are retained and unlinked; last-admin protection remains. | Backend/security agent |
| iOS Safari | Main public pages + auth + publish form | Manual device QA until browser automation exists | No blocking layout overflow; forms usable; uploads respect limits. | QA agent |
| iOS Chrome | Main public pages + auth + publish form | Manual device QA until browser automation exists | Same pass criteria as iOS Safari. | QA agent |
| Android Chrome | Main public pages + auth + publish form | Manual device QA until browser automation exists | Same pass criteria as iOS Safari. | QA agent |
| Desktop Chrome | Homepage, listing, publish, admin basics | Manual/device QA or future Playwright gate | No console-breaking runtime errors; responsive layout holds. | QA agent |
| SEO title/meta | Homepage and key public routes | `npm run smoke:seo` | Title/description/canonical/OG basics present where implemented; no private data in metadata. | SEO/AEO agent |
| Robots and sitemap | `/robots.txt`, `/api/sitemap.xml` or configured sitemap URL | `npm run smoke:seo` | Reachable where configured; no private/admin URLs indexed. | SEO/AEO agent |
| Public copy | Homepage/static public text | `npm run smoke:copy` | No public debug, stacktrace, MVP/internal launch wording except allowed attributes/code contexts. | UX/QA agent |
| Compose/deploy health | Docker services | `docker compose -f docker-compose.yml -f docker-compose.override.yml ps` | Core containers are up/healthy; frontend binds 80/443; backend/redis/db healthy. | Infra agent |
| Runner health | GitHub self-hosted runners | `docker ps` + GitHub workflow run status | Runners are listening for jobs; deploy and production checks complete successfully. | Infra/CI agent |

## Merge policy

A PR or direct autonomous commit may be merged only when all applicable gates are green:

1. Low-risk docs/checklist-only change: `npm run check:scripts` if scripts changed; otherwise GitHub diff review is enough.
2. Frontend/UI change: `npm run build` and `npm run verify:quick`.
3. Backend/API/security/payment/routing change: `npm run gate:prod`.
4. Production infra/runner change: `npm run verify:quick`, successful Deploy Mercasto workflow, and successful Production checks workflow.
5. SEO/AEO change: `npm run smoke:seo`, `npm run smoke:copy`, and `npm run verify:quick`.

## Failure policy

If any gate fails:

- Stop merging related work.
- Capture the failing command and first actionable error.
- Fix in the smallest possible patch.
- Re-run only the failed workflow/job when safe; otherwise re-run the full gate.
- Add rollback notes to the issue or PR before closing.

## Next automation upgrades

- Add authenticated Playwright smoke when stable test credentials exist.
- Add signed Clip webhook fixture tests using non-production secrets.
- Add browser matrix artifacts for iOS Safari, iOS Chrome, Android Chrome, desktop Chrome.
- Promote this matrix into branch protection once native auto-merge is enabled in repository settings.
