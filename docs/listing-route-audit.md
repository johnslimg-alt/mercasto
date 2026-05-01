# Mercasto listing route audit

Status: requires browser/API verification before changing nginx routing.

## Current known facts

- Backend API exposes listing detail through:

```php
Route::get('/ads/{id}', [AdController::class, 'show']);
```

- Frontend has an `AdDetailScreen` component.
- Nginx currently contains a legacy redirect rule:

```nginx
location ~* ^/listing/ {
    return 301 /;
}
```

## Risk

If the product uses or later introduces `/listing/{id}` or `/listing/{slug}` as a public detail route, the nginx rule will redirect users to `/` and break listing deep links.

Do not remove this rule blindly until the actual canonical detail URL is verified.

## Required checks

Run against production:

```bash
curl -I https://mercasto.com/api/ads/1
curl -I https://mercasto.com/listing/1-test
curl -I https://mercasto.com/ad/1
curl -I https://mercasto.com/ads/1
```

Then verify in browser:

- open a listing card from home/catalog;
- copy the browser URL;
- reload the detail URL directly;
- confirm it does not redirect incorrectly;
- confirm page renders title, price, images, seller card and WhatsApp CTA.

## Safe outcomes

### If canonical detail is API-backed SPA state only

No nginx change is required yet, but future detail deep links should be planned.

### If canonical detail is `/ads/{id}`

Ensure nginx SPA fallback lets `/ads/{id}` reach frontend, or backend serves expected route.

### If canonical detail is `/listing/{id}`

Remove or replace the current redirect rule.

Potential replacement for SPA detail routes:

```nginx
# Let React handle listing deep links through SPA fallback.
# Remove the old /listing/ redirect.
```

## Definition of done

Listing routing is safe when:

- listing cards open detail page;
- direct refresh of listing detail URL works;
- old/deprecated detail URLs either redirect to correct canonical URL or safely return 410;
- no valid detail route redirects to `/` unintentionally.
