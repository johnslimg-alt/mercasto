# Mercasto Route Inventory

Last reviewed against production commit `dfe868ed` on 2026-08-15 UTC.

This document is the curated security and release inventory for high-risk route groups. The complete machine-generated Laravel snapshot is [`route-inventory-generated.md`](./route-inventory-generated.md); it contains every non-vendor route and the exact middleware emitted by `php artisan route:list --except-vendor -v`.

## Runtime routing model

- Public browser paths such as `/login`, `/register`, canonical protected shells `/post`, `/profile`, `/admin`, and vertical landing pages are React SPA surfaces. A browser `200` does **not** grant access to protected data. Legacy aliases such as `/publish`, `/account/*` and `/admin/login` redirect to canonical SPA routes.
- Authentication and state changes happen through `/api/*` routes.
- Protected APIs use Sanctum bearer authentication. Browser cookies and CSRF tokens are not accepted as a substitute for a valid bearer token; this is enforced by `production-session-security-smoke.sh` and `csrf-session-contract-gate.sh`.
- OAuth redirect/callback routes additionally carry `web` middleware where shown by Laravel.
- State-changing routes are the non-GET rows marked **Yes** below. Public state-changing routes must have an explicit throttle and must not create authenticated effects without server-side verification.
- Unnamed Laravel routes receive random `generated::<token>` names when route cache is built. The generated artifact normalizes those non-contractual names to `generated::<auto>`.

## Source and regeneration

```bash
cd /var/www/mercasto
bash scripts/route-inventory-gate.sh
bash scripts/server-operator.sh verify_quick
```

The gate runs the authoritative command inside the Laravel runtime:

```bash
php artisan route:list --except-vendor -v
```

## Inventory fields

| Field | Meaning |
| --- | --- |
| Method / URI | Exact public or API surface. |
| Controller/action | Laravel action from the generated snapshot. |
| Middleware | Short form of the middleware visible in `route:list`. |
| Auth | Whether Sanctum bearer authentication is required at the route layer. |
| State-changing | Whether the route can mutate account, listing, payment, moderation or notification state. |
| Request control | Named or numeric throttle shown by Laravel; `api` means the normal API limiter. |
| Verification | Existing release/security gate that covers the route family. |

## Public web and SEO shell

| Method / URI | Controller/action | Middleware | Auth | State-changing | Request control | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /` | SPA/web route | `web` | No | No | Edge limits | `production-route-audit.sh` |
| `GET /ads/{id}` | `SeoShellController@ad` | `web` | No | No | Edge limits | `listing-route-smoke.sh` |
| `GET /share/ads/{id}` | `ShareAdController` | `web` | No | No | Edge limits | `share-og-smoke.sh` |
| `GET /sitemap.xml` | `SitemapController@sitemapIndex` | `web` | No | No | Edge limits | `seo-public-audit.sh` |
| `GET /sitemap-main.xml` | `SitemapController@index` | `web` | No | No | Edge limits | `seo-public-audit.sh` |
| `GET /sitemap-ads.xml` | `SitemapController@ads` | `web` | No | No | Edge limits | `seo-public-audit.sh` |
| `GET /sitemap-categories.xml` | `SitemapController@categories` | `web` | No | No | Edge limits | `seo-public-audit.sh` |
| `GET /sitemap-states.xml` | `SitemapController@states` | `web` | No | No | Edge limits | `seo-public-audit.sh` |

React routes under `/login`, `/register`, canonical `/post`, `/profile`, `/admin`, payment return surfaces and public verticals are validated as shell/deep-link routes by `production-route-audit.sh`; their protected data is loaded only from the authenticated APIs below. Acquisition aliases `/vendedores` and `/publicar-gratis` are intentionally rewritten to `/post`, while legacy `/publish`, `/account/*` and `/admin/login` routes redirect to their canonical SPA destinations.

## Authentication and account lifecycle

| Method / URI | Controller/action | Middleware | Auth | State-changing | Request control | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /api/auth/providers` | `AuthController@getProviders` | `api` | No | No | `api` | `auth-providers-smoke.sh` |
| `POST /api/register` | `AuthController@register` | `api` | No | **Yes** | `auth` | `auth-account-gate.sh` |
| `POST /api/login` | `AuthController@login` | `api` | No | **Yes** | `auth` | `auth-account-gate.sh` |
| `POST /api/login/two-factor` | `AuthController@loginTwoFactor` | `api` | No | **Yes** | `auth` | `auth-account-gate.sh` |
| `POST /api/logout` | `AuthController@logout` | `api`, `auth:sanctum` | Yes | **Yes** | API/auth policy | `production-session-security-smoke.sh` |
| `POST /api/forgot-password` | `AuthController@forgotPassword` | `api` | No | **Yes** | `auth` | `auth-account-gate.sh` |
| `POST /api/reset-password` | `AuthController@resetPassword` | `api` | No | **Yes** | `auth` | `auth-account-gate.sh` |
| `POST /api/auth/oauth/exchange` | `AuthController@exchangeOAuthCode` | `api` | No | **Yes** | `auth` | `auth-account-gate.sh` |
| `GET /api/auth/{provider}/redirect` | `AuthController@redirectToProvider` | `api`, `web` | No | No | Provider/state checks | `auth-providers-smoke.sh` |
| `GET /api/auth/{provider}/callback` | `AuthController@handleProviderCallback` | `api`, `web` | No | **Yes** | Provider/state checks | `auth-account-gate.sh` |
| `GET /api/user` | `ProfileController@show` | `api`, `auth:sanctum` | Yes | No | API policy | `auth-account-gate.sh` |
| `DELETE /api/user` | `AccountDeletionController@delete` | `api`, `auth:sanctum` | Yes | **Yes** | API/account policy | `auth-account-gate.sh` |
| `PUT|POST /api/user/password` | `ProfileController@changePassword` | `api`, `auth:sanctum` | Yes | **Yes** | API/account policy | `auth-account-gate.sh` |
| `POST /api/user/email/request` | `ProfileController@requestEmailChange` | `api`, `auth:sanctum` | Yes | **Yes** | `3,1` | `auth-account-gate.sh` |
| `POST /api/user/email/confirm` | `ProfileController@confirmEmailChange` | `api`, `auth:sanctum` | Yes | **Yes** | API/account policy | `auth-account-gate.sh` |
| `POST|DELETE /api/user/two-factor-authentication` | `TwoFactorAuthenticationController@store|destroy` | `api`, `auth:sanctum` | Yes | **Yes** | API/account policy | `auth-account-gate.sh` |
| `POST /api/user/two-factor-authentication/confirm` | `TwoFactorAuthenticationController@confirm` | `api`, `auth:sanctum` | Yes | **Yes** | API/account policy | `auth-account-gate.sh` |

Phone OTP routes exist in the inventory but public SMS launch mode remains disabled; `sms-launch-mode-smoke.sh` is the release authority for that feature.

## Listing publish and seller lifecycle

| Method / URI | Controller/action | Middleware | Auth | State-changing | Request control | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /api/ads` | `AdIndexController@index` | `api` | No | No | `search` | `location-search-gate.sh` |
| `POST /api/ads` | `AdController@store` | `api`, `auth:sanctum` | Yes | **Yes** | `ads` | `listing-lifecycle-gate.sh` |
| `GET /api/ads/{id}` | `AdController@show` | `api` | No | No | `api` | `listing-route-smoke.sh` |
| `GET /api/ads/{id}/edit` | `AdController@editForm` | `api`, `auth:sanctum` | Yes | No | `api` | `edit-ad-contract-gate.sh` |
| `POST /api/ads/{ad}` | `AdController@update` | `api`, `auth:sanctum` | Yes | **Yes** | `ad-mutations` | `edit-ad-contract-gate.sh` |
| `DELETE /api/ads/{id}` | `AdController@destroy` | `api`, `auth:sanctum` | Yes | **Yes** | `ad-mutations` | `listing-lifecycle-gate.sh` |
| `PUT /api/ads/{id}/activate` | `AdController@activate` | `api`, `auth:sanctum` | Yes | **Yes** | `ad-mutations` | `ad-activation-lifecycle-gate.sh` |
| `PUT /api/ads/{id}/pause` | `AdController@pause` | `api`, `auth:sanctum` | Yes | **Yes** | `ad-mutations` | `ad-activation-lifecycle-gate.sh` |
| `PATCH /api/ads/{id}/status` | `AdController@updateStatus` | `api`, `auth:sanctum` | Yes | **Yes** | `ad-mutations` | `ad-activation-lifecycle-gate.sh` |
| `PUT /api/ads/{id}/renew` | `AdController@renew` | `api`, `auth:sanctum` | Yes | **Yes** | `ad-mutations` | `paid-renewal-contract-gate.sh` |
| `POST /api/ads/{id}/republish` | `AdController@republish` | `api`, `auth:sanctum` | Yes | **Yes** | `ad-mutations` | `listing-lifecycle-gate.sh` |
| `POST /api/ads/generate-description` | `AiDescriptionController` | `api`, `auth:sanctum` | Yes | No persisted listing mutation | `5,1` | `AiDescriptionFallbackTest` |
| `POST /api/ads/bulk-action` | `AdController@bulkAction` | `api`, `auth:sanctum` | Yes | **Yes** | `10,1` | `listing-lifecycle-gate.sh` |
| `POST /api/ads/bulk-upload` | `AdController@bulkUpload` | `api`, `auth:sanctum` | Yes | **Yes** | `uploads` | `media-upload-validation-scan.sh` |
| `GET /api/user/ads` | `AdController@myAds` | `api`, `auth:sanctum` | Yes | No | API policy | `listing-lifecycle-gate.sh` |

Listing ownership and seller authorization are controller/policy requirements in addition to the route-level Sanctum guard.

## Upload and identity surfaces

| Method / URI | Controller/action | Middleware | Auth | State-changing | Request control | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /api/user/avatar` | `ProfileController@uploadAvatar` | `api`, `auth:sanctum` | Yes | **Yes** | `profile-uploads` | `media-upload-validation-scan.sh` |
| `POST /api/user/business-profile/logo` | `BusinessProfileController@uploadLogo` | `api`, `auth:sanctum` | Yes | **Yes** | `profile-uploads` | `media-upload-validation-scan.sh` |
| `POST /api/user/business-profile/banner` | `BusinessProfileController@uploadBanner` | `api`, `auth:sanctum` | Yes | **Yes** | `profile-uploads` | `media-upload-validation-scan.sh` |
| `POST /api/user/business-profile/csf` | `BusinessProfileController@uploadCsf` | `api`, `auth:sanctum` | Yes | **Yes** | `identity-uploads` | `xml-upload-security-gate.sh` |
| `POST /api/user/kyc` | `ProfileController@submitKyc` | `api`, `auth:sanctum` | Yes | **Yes** | `identity-uploads` | `media-upload-validation-scan.sh` |
| `POST /api/admin/banners/upload` | `AdBannerController@uploadImage` | `api`, `auth:sanctum` | Yes | **Yes** | Admin policy | `media-upload-validation-scan.sh` |

Ad photos are submitted through listing create/update payloads; the current Laravel inventory has no separate `/account/photo/*` form routes. The removed placeholder photo routes in the previous document were not runtime routes.

## Search, discovery and contact

| Method / URI | Controller/action | Middleware | Auth | State-changing | Request control | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /api/categories` | `CategoryController@index` | `api` | No | No | `api` | `production smoke` |
| `GET /api/category-attributes` | `CategoryAttributeController@index` | `api` | No | No | `search` | `attribute-flow-gate.sh` |
| `GET /api/search/suggestions` | `SearchController@suggestions` | `api` | No | No | `search` | `location-search-gate.sh` |
| `GET /api/search/semantic` | `SearchController@semanticSearch` | `api` | No | No | `search` | `SearchReadinessTest` |
| `GET /api/ads/{id}/similar` | `AdController@similar` | `api` | No | No | `search` | `location-search-gate.sh` |
| `GET /api/recommendations/trending` | `RecommendationController@trending` | `api` | No | No | `api` | recommendation smoke/contracts |
| `POST /api/ads/{id}/contact-seller` | `ContactController@contactSeller` | `api` | No | **Yes** — contact event | `5,60` | `chat-api-security-gate.sh` / contact analytics gate |
| `POST /api/ads/{id}/report` | `AdController@report` | `api` | No | **Yes** — report | `5,1` | moderation/report contracts |
| `POST /api/users/{id}/report` | `ProfileController@report` | `api` | No | **Yes** — report | `5,1` | moderation/report contracts |
| `GET|POST|PATCH|DELETE /api/user/search-alerts...` | `SearchAlertController` | `api`, `auth:sanctum` | Yes | POST/PATCH/DELETE: **Yes** | create `10,1` | `search-alert-flow-gate.sh` |
| `GET|POST|PATCH|DELETE /api/user/saved-searches...` | `SavedSearchController` | `api`, `auth:sanctum` | Yes | POST/PATCH/DELETE: **Yes** | API policy | `search-alert-flow-gate.sh` |

## Payments, renewals and promotions

| Method / URI | Controller/action | Middleware | Auth | State-changing | Request control | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /api/payment/clip` | `PaymentController@createClipCheckout` | `api`, `auth:sanctum` | Yes | **Yes** — creates checkout | `10,1` | payment launch tests |
| `POST /api/payment/balance` | `PaymentController@payWithBalance` | `api`, `auth:sanctum` | Yes | **Yes** | `10,1` | payment launch tests |
| `POST /api/payment/webhook` | `PaymentController@handleWebhook` | `api` | Provider-authenticated | **Yes** | `60,1` | `payment-webhook-idempotency-scan.sh` |
| `POST /api/webhooks/clip` | `PaymentController@handleWebhook` | `api` | Provider-authenticated | **Yes** | `60,1` | `payment-webhook-idempotency-scan.sh` |
| `POST /api/webhooks/clip/ad-renewal` | `AdRenewalWebhookController` | throttle middleware | Provider-authenticated | **Yes** | `60,1` | `paid-renewal-contract-gate.sh` |
| `POST /api/ads/{id}/promote/credits` | `AdController@promoteWithCredits` | `api`, `auth:sanctum` | Yes | **Yes** | `ad-mutations` | promotion/payment contracts |
| `POST /api/ads/promote/credits/bulk` | `AdController@promoteWithCreditsBulk` | `api`, `auth:sanctum` | Yes | **Yes** | `ad-mutations` | promotion/payment contracts |
| `POST /api/user/coupons/redeem` | `PaymentController@redeemCoupon` | `api`, `auth:sanctum` | Yes | **Yes** | `5,1` | payment contracts |
| `GET /api/user/payments` | `PaymentController@getUserPayments` | `api`, `auth:sanctum` | Yes | No | API policy | payment launch tests |

Customer return pages are presentation-only SPA routes. Payment, renewal or promotion effects must originate from verified server-side state or idempotent provider webhooks, never from a success URL.

## Admin and moderation boundary

The generated inventory contains admin KYC, moderation, reports, banners, coupons, placements, marketing and payment routes. They all show Sanctum at the route layer. Admin/role authorization is therefore a controller/policy invariant and remains covered by admin, moderation and security gates; adding an admin route without both Sanctum and an authorization decision is a release blocker.

## Known compatibility aliases

- Client-side SPA aliases: `/publish` → `/post`, `/account` → `/profile`, `/account/listings` → `/profile?tab=my_ads`, `/account/billing` → `/profile?tab=transactions`, `/account/promotions` → `/tarifas`, and `/admin/login` → `/admin`.
- Seller acquisition aliases `/vendedores` and `/publicar-gratis` are normalized to `/post` before React mounts so paid/organic acquisition enters the publication flow directly.
- `PUT` and `POST` aliases exist for `/api/user/profile`, `/api/user/password` and `/api/user/notifications`.
- Both `/api/payment/webhook` and `/api/webhooks/clip` route to `PaymentController@handleWebhook`.
- Legacy `/listing/{id}` and `/listing/{id}-{slug}` browser routes redirect to the canonical listing path; `listing-route-smoke.sh` verifies the redirect contract.

## Release gates

```bash
bash scripts/check-route-inventory-artifact.sh
bash scripts/route-inventory-doc-gate.sh
npm run check:static-safety
bash scripts/server-operator.sh verify_quick
```

Stop the release if the generated inventory is missing, still contains random `generated::<token>` names, the curated document contains unresolved placeholders, a protected state-changing route loses Sanctum, or a public mutation loses its throttle/provider verification contract.
