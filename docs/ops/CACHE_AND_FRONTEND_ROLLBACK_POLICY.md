# Mercasto cache and frontend rollback policy

This policy defines how autonomous agents should handle frontend cache, service worker risk, CDN/browser staleness, and frontend-only rollback decisions.

## Current policy

Mercasto must prefer predictable freshness over aggressive offline caching until there is a tested service-worker strategy.

- Do not add a service worker or PWA caching layer without a dedicated PR, test plan, and rollback.
- Do not cache authenticated API responses in browser storage, service workers, or public proxies.
- Do not cache payment, auth, profile, admin, chat, upload, or notification responses.
- Static built assets may be long-cacheable only when file names are content-hashed.
- HTML entry documents must remain short-cache/no-cache so deployments become visible quickly.
- Public API responses may use server-side cache only where explicitly implemented and invalidated.

## Allowed cache behavior

| Surface | Policy | Reason |
| --- | --- | --- |
| `index.html` / SPA entry | no-cache or very short cache | Prevent users from being stuck on old JS bundles after deploy. |
| Vite hashed assets | long cache allowed | File hash changes on content change. |
| Public category/listing APIs | short cache or application cache with explicit invalidation | Improves speed while keeping marketplace data fresh. |
| Auth/profile/payment/admin/chat/upload APIs | no-store/no-cache | Protects private and financial data. |
| Sitemap/merchant feed | cache with explicit invalidation | SEO surfaces can be cached if invalidated on listing/profile changes. |
| Images/videos | CDN/object storage cache allowed | Media files are content references, not executable state. |

## Service worker rule

No service worker should be registered in production unless all of these are true:

1. It has a versioned cache namespace.
2. It deletes older cache namespaces on activate.
3. It never intercepts auth/payment/admin/chat/upload/API mutation requests.
4. It has a documented kill switch.
5. It passes browser smoke on iOS Safari, iOS Chrome, Android Chrome, and desktop Chrome.
6. It has a rollback procedure that forces clients to pick up the previous entrypoint.

## Frontend-only incident rollback tree

Use this when the public site loads but the frontend is visibly broken, while backend health remains good.

1. Confirm scope:
   - `curl -I https://mercasto.com/`
   - `curl -I https://mercasto.com/api/categories`
   - `curl -I https://mercasto.com/api/ads?page=1`
2. If homepage/API are 5xx, treat as production incident, not frontend-only.
3. If APIs are 200 and UI is broken:
   - identify the last frontend-affecting commit;
   - revert that commit or deploy the last known-good frontend image;
   - run `npm run verify:quick`;
   - confirm homepage, categories API, ads API, listing routes, security probes, and public copy scan.
4. If users still see broken UI after rollback:
   - verify HTML cache headers;
   - force a new frontend build with changed asset hashes;
   - avoid adding manual browser-cache instructions as the primary fix.

## Autonomous agent merge rules

- Frontend/UI PR: requires `npm run build` and `npm run verify:quick`.
- Cache/header/service-worker PR: requires `npm run gate:prod` and explicit rollback notes.
- SEO/AEO PR: requires `npm run smoke:seo`, `npm run smoke:copy`, and `npm run verify:quick`.
- Never merge cache/service-worker changes by native auto-merge until the full matrix passes.

## Red flags that block auto-merge

- Adds `navigator.serviceWorker.register` without a kill switch.
- Adds broad `Cache-Control: public` to HTML, auth, payment, admin, or API mutation routes.
- Caches `Authorization` responses.
- Stores Clip/payment webhook payloads or tokens in frontend-accessible storage.
- Changes nginx/Caddy/cache headers without smoke and rollback notes.

## Required follow-up automation

Add or extend smoke checks to verify:

- homepage cache headers;
- no registered service worker unless explicitly approved;
- no public cache headers on private/payment/admin endpoints;
- hashed static assets are reachable after deploy;
- rollback command/process is documented in the deploy runbook.
