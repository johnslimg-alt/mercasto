# Mercasto listing route canonical decision

Date: 2026-05-06

## Current production behavior

- `/ads/{id}` returns the React SPA and is accepted by route smoke.
- `/ad/{id}` returns the React SPA and is accepted by route smoke.
- `/listing/{id}` and `/listing/{id}-{slug}` are legacy routes.
- `default.conf` redirects `/listing/*` to `/` with HTTP 301.

## Current code evidence

- Frontend API data access uses `/api/ads/...`.
- Public route smoke checks `/ads/{id}` and `/ad/{id}` as valid non-5xx detail routes.
- Nginx contains an explicit retired-route rule for `/listing/*`.

## Decision

For the current production build, `/ads/{id}` and `/ad/{id}` remain accepted public SPA detail routes.

`/listing/*` stays retired and redirected to `/` until a later SEO migration introduces a real canonical `/listing/{id}-{slug}` route.

## Do not change yet

Do not remove the nginx `/listing/*` redirect without first updating:
- React route handling
- listing card links
- route smoke tests
- SEO/canonical URL policy
- post-deploy smoke checklist
