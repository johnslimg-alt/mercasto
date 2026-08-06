# Mercasto listing detail route policy

Status: verified against production on 2026-08-06.

## Canonical routes

| Surface | Route | Current policy |
| --- | --- | --- |
| Public listing detail | `/ads/{id}` | Canonical direct/share/indexable detail route. Must render the listing represented by `/api/ads/{id}`. |
| Listing API | `/api/ads/{id}` | Canonical public JSON source for one active listing. |
| In-session card detail | `/#ad-{id}` | Supported client-side compatibility state used by listing cards. Direct refresh must restore the same detail. |
| Singular alias | `/ad/{id}` | Not canonical. Currently reaches the SPA shell and renders a controlled in-app not-found state. Do not publish or index this URL. |
| Legacy listing path | `/listing/{id}` and `/listing/{id}-{slug}` | Deprecated. Nginx redirects these paths to `/`; they are not valid detail URLs. |

New links, metadata, sitemaps, sharing actions, and structured data must use `/ads/{id}` only.

## Current implementation

The backend exposes listing JSON through:

```php
Route::get('/ads/{id}', [AdController::class, 'show']);
```

The frontend accepts `/ads/{id}` during initial route parsing and restores listing detail from the API. Listing-card interaction currently stores the selected detail in the URL hash as `#ad-{id}`.

The legacy nginx `/listing/` redirect remains intentionally unchanged. Removing it is not required for the current canonical route and would need a separate migration plan if old external links are ever restored.

## Required regression coverage

The public Playwright smoke must verify on desktop and mobile that:

1. the ads API returns at least one public listing;
2. `/ads/{id}` returns a non-error response;
3. the rendered page contains that API listing title;
4. canonical detail does not render the controlled 404 state;
5. a real listing card opens `#ad-{id}`;
6. direct refresh retains the selected detail;
7. the detail screen has no horizontal overflow.

The card test intercepts the listing-view analytics POST so recurring smoke remains read-only and does not inflate production view counters.

Shell route smoke remains useful for detecting 5xx and edge-routing failures, but it does not prove that a SPA shell rendered the correct listing. Browser coverage is authoritative for detail content.

## Verified production evidence

On 2026-08-06, ad `6336` produced:

- `/api/ads/6336` → 200;
- `/ads/6336` → 200 and rendered the listing detail;
- `/#ad-6336` → 200 and restored the listing detail;
- `/ad/6336` → SPA 200 with controlled in-app not-found content;
- `/listing/6336` and `/listing/6336-test` → legacy redirect to `/`.

The expanded public launch matrix passed 44/44 across Desktop Chrome and Pixel 7, including canonical-detail and card-refresh checks. Both viewports had zero horizontal overflow and no JavaScript page errors.

## Change rules

- Do not change the canonical route away from `/ads/{id}` without updating canonical metadata, sitemap generation, sharing, JSON-LD, browser smoke, and redirects in one reviewed migration.
- Do not treat any HTTP 200 SPA shell as proof of a valid detail page; verify rendered content.
- Do not remove the legacy `/listing/` redirect merely to make an undocumented alias appear functional.
- Do not add `/ad/{id}` to public links while it remains a controlled not-found route.
- Keep route-policy changes separate from auth, publishing, payments, and database work.
