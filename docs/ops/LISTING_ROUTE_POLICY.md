# Mercasto Listing Route Policy

This document records the current production route policy for listing detail URLs so agents do not accidentally break deep links, SEO, or marketplace navigation.

## Current route classes

Mercasto currently tolerates multiple public listing detail URL families:

- `/ads/{id}`
- `/ad/{id}`
- `/listing/{id}`
- `/listing/{id}-{slug}`

The API detail route is:

- `/api/ads/{id}`

## Policy

1. Do not remove or hard-block legacy listing detail routes unless a migration and redirect plan exists.
2. Do not introduce 5xx behavior on any listing detail URL family.
3. Prefer one canonical public URL in metadata and UI links, but keep legacy routes safe for external links and indexed URLs.
4. Keep route smoke non-destructive and status-based.
5. Treat `/api/ads/{id}` as the source of listing detail data for frontend pages.

## Current smoke coverage

The release gate uses `scripts/listing-route-smoke.sh` through `npm run smoke:routes` and `npm run verify:quick`.

The smoke script:

- discovers the first listing id from `/api/ads?page=1` when available;
- checks `/api/ads/{id}`;
- checks `/ads/{id}`;
- checks `/ad/{id}`;
- checks `/listing/{id}`;
- checks `/listing/{id}-test`;
- fails only on 5xx responses, allowing redirects and controlled 404s where no listing exists.

## Safe change process

Before changing listing routes, run:

```bash
npm run smoke:routes
npm run verify:quick
```

After changing canonical link generation or frontend route behavior, also run:

```bash
npm run smoke:seo
```

## Rollback

If a listing route change causes 5xx, broken deep links, or SEO regressions:

1. revert the route/UI change;
2. redeploy or restart only the affected service;
3. rerun `npm run smoke:routes` and `npm run verify:quick`;
4. record the failed route and status in the issue.

## Definition of done for route changes

- no listing route returns 5xx;
- public listing detail can render for a valid ad id;
- API listing detail remains reachable;
- SEO canonical behavior is intentional and documented;
- `npm run verify:quick` passes.
