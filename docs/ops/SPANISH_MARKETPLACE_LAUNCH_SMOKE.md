# Mercasto Spanish marketplace launch smoke

Purpose: validate Mercasto as a Spanish-first marketplace product before and after production-facing changes.

This checklist complements automated gates. It is intentionally product-facing and mobile-first.

## Automated baseline

Run before manual QA:

```bash
npm run verify:quick
npm run smoke:copy
npm run smoke:seo
npm run smoke:routes
```

Server operators can run:

```bash
bash scripts/server-gate.sh quick
bash scripts/server-gate.sh seo
```

## Public homepage smoke

| Check | Expected result |
| --- | --- |
| Homepage loads over HTTPS | Page renders without blank screen or browser error. |
| Spanish-first copy | Primary copy is customer-facing Spanish for Mexico. |
| Marketplace intent is clear | User immediately understands they can buy, sell, rent, or find services. |
| No internal launch copy | No MVP/debug/construction/fallback wording is visible. |
| Primary CTA is visible | Publish/sell action is easy to find. |
| Search/category entry is visible | User can start browsing without login. |
| Mobile header is usable | Header, menu, and CTAs are tappable on small screens. |

## Category browsing smoke

| Check | Expected result |
| --- | --- |
| Categories load | Category list or icons render without 5xx/API failure. |
| Category labels are Spanish-safe | Labels look production-ready and understandable. |
| Category tap/click works | Selecting a category changes the listing feed or navigates to the expected view. |
| Empty category state is safe | If no listings exist, the empty state is useful and not debug-like. |

## Listing feed smoke

| Check | Expected result |
| --- | --- |
| Feed loads | Listing API returns a controlled response even when catalog is empty. |
| Cards fit mobile viewport | No horizontal overflow, clipped price, or broken button layout. |
| Listing card fields are safe | Title, price, location, category and seller signals do not expose internal data. |
| Pagination/search state is controlled | No infinite loading loop or 5xx when feed is empty. |
| Fallback image state is polished | Missing photos show a clean placeholder, not broken media. |

## Listing detail and route smoke

| Check | Expected result |
| --- | --- |
| Known listing detail route works | Existing listing detail route returns a controlled page/API response. |
| Retired listing routes are controlled | Legacy or retired routes redirect or fail safely. |
| Listing unavailable state is safe | Hidden/review/deleted listings do not expose private seller data. |
| Share/deep-link behavior is stable | Refreshing detail route does not produce blank screen. |

## Auth and publish entry smoke

| Check | Expected result |
| --- | --- |
| Login/register entry visible | User can find auth entry points without broken UI. |
| Guest publish behavior is intentional | Guest is redirected or prompted to log in, not shown a broken form. |
| Publish form mobile layout is usable | Inputs, category selector, location, price, photo upload and submit button fit mobile. |
| Validation copy is Spanish-safe | Invalid form states are clear and do not show stack/debug text. |

## Media smoke

| Check | Expected result |
| --- | --- |
| Image upload expectations are clear | User sees acceptable photo behavior without guessing. |
| Oversized/invalid file behavior is controlled | Error is user-safe and Spanish-first where surfaced by the app. |
| Stored media renders inertly | Public media displays as media only, not executable content. |
| Missing media is graceful | No broken-image icon dominates the UI. |

## Payment and promotion smoke

| Check | Expected result |
| --- | --- |
| Promotion/payment entry requires auth | Anonymous users cannot create paid mutations. |
| Checkout errors are safe | Missing payment config or provider error shows controlled Spanish-safe response. |
| Return URLs are presentation-only | Success/error return pages or query states do not mark payment as paid. |
| Paid effects rely on webhook | Business effects are applied after verified provider notification only. |

## SEO/AEO smoke

| Check | Expected result |
| --- | --- |
| Homepage title and description exist | Title/description are Spanish Mexico marketplace oriented. |
| Canonical URL exists | Homepage canonical points to the production domain. |
| Open Graph/Twitter metadata exists | Share previews are not empty or internal. |
| Structured data exists where expected | Homepage has schema/search signal. |
| robots/sitemap are reachable | Public index surfaces are available and do not include private paths. |

## Mobile matrix

Minimum manual device/browser matrix before launch-impacting UI changes:

| Device/browser | Required checks |
| --- | --- |
| iOS Safari | Homepage, category browse, feed, listing detail, auth entry, publish entry. |
| iOS Chrome | Same as iOS Safari. |
| Android Chrome | Same as iOS Safari. |
| Desktop Chrome | Homepage, feed, listing detail, auth entry, publish entry. |

## Failure policy

If any launch smoke fails:

1. Record exact page, viewport, and action.
2. Capture visible customer-facing failure, not private payloads.
3. Fix the smallest reproducible cause.
4. Run the relevant automated gate again.
5. Do not close the issue until the failure is either fixed or explicitly moved to a follow-up lane.

## Current automation coverage

| Area | Automated command |
| --- | --- |
| Public availability | `npm run smoke:prod` |
| Public copy | `npm run smoke:copy` |
| SEO/AEO | `npm run smoke:seo` |
| Listing routes | `npm run smoke:routes` |
| Security surface | `npm run smoke:security` |
| Public auth provider status | `npm run smoke:auth-providers` |
| Public root manifest denial | `npm run smoke:public-manifests` |
| Cache/PWA policy | `npm run check:cache-policy` and `npm run smoke:cache-headers` |
| Payment retention and webhook idempotency | `npm run check:payment-retention` and `bash scripts/payment-webhook-idempotency-scan.sh` |
| Media validation source invariants | `bash scripts/media-upload-validation-scan.sh` |
