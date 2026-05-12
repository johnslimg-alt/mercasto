# Spanish Marketplace Launch Smoke Checklist

Use this checklist before public launch changes and after production deploys that affect public UX.

## Scope

Public buyer and seller experience in Spanish for Mercasto Mexico.

## Home page

- Page loads successfully on desktop and mobile.
- Main headline clearly explains the marketplace purpose.
- Primary buyer action is visible.
- Primary seller/publish action is visible.
- Category row is horizontally scrollable where needed and does not wrap into a broken grid.
- No internal, debug, MVP, stack trace, placeholder, or construction copy is visible.

## Categories and search

- Category links open the expected category/catalog view.
- Empty states are helpful and written in Spanish.
- Search and filters do not show technical fallback text.
- Public API categories endpoint returns HTTP 200.

## Listing routes

- `/api/ads?page=1` returns HTTP 200.
- `/ads/1` and `/ad/1` remain compatible routes while existing smoke coverage expects them.
- Retired or legacy listing routes must either redirect predictably or return a safe public response.
- Listing detail pages show title, price, location, seller context, and media area without layout breakage.

## Mobile UX

- Header and navigation are usable on a small mobile viewport.
- Primary CTA tap targets are large enough to use comfortably.
- No horizontal page-level overflow appears, except intended horizontal category/item rails.
- Forms are readable and inputs are not clipped.

## Public copy

- Spanish copy is production-ready and user-facing.
- No wording suggests a test build, demo build, or unfinished product.
- Error and empty states explain next steps in plain Spanish.
- Seller-facing copy avoids internal implementation terms.

## SEO and AEO smoke

- Homepage has a meaningful title.
- Homepage has a meaningful description.
- Open Graph metadata exists.
- Twitter card metadata exists where supported.
- Structured data is present where relevant.
- `robots.txt` is reachable.
- `sitemap.xml` is reachable.

## Security-adjacent public smoke

Expected safe responses:

- `/.env` returns 404 or 403.
- `/.git/config` returns 404 or 403.
- `/backend/.env` returns 404 or 403.
- `/horizon` returns 404 or 403.
- `/vendor/horizon` returns 404 or 403.

## Commands

```bash
cd /var/www/mercasto
npm run verify:quick
bash scripts/server-operator.sh status
bash scripts/server-operator.sh seo_aeo_smoke
bash scripts/server-operator.sh security_smoke
```

## Acceptance criteria

- Public smoke passes.
- Security smoke passes.
- SEO/AEO smoke passes.
- No public copy exposes internal project language.
- Mobile public flows remain usable.
