# Mercasto Route Inventory

Status: draft template
Owner: production coordination lane

This document is the shared source of truth for route, middleware and smoke coverage reviews.

## Source command

Run from the production repository root or an equivalent checked-out environment:

```bash
cd /var/www/mercasto/backend
php artisan route:list --except-vendor -v
```

Filtered views, if needed:

```bash
php artisan route:list --except-vendor --path=api
php artisan route:list --except-vendor --path=account
php artisan route:list --except-vendor --path=payment
```

## Inventory fields

| Method | URI | Name | Controller/action | Middleware | Auth required | State-changing | CSRF/session expectation | Request-limit expectation | Smoke coverage | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Public pages

| Method | URI | Name | Controller/action | Middleware | Auth required | State-changing | CSRF/session expectation | Request-limit expectation | Smoke coverage | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/` | TBD | TBD | TBD | No | No | N/A | Normal web limits | `verify:quick` should cover `/` | Fill from route:list. |
| GET | `/listings` or catalog route | TBD | TBD | TBD | No | No | N/A | Pagination bounds expected | Needs catalog smoke | Fill from route:list. |
| GET | `/listing/{id}` or canonical detail route | TBD | TBD | TBD | No | No | N/A | Normal web limits | Needs detail smoke | Confirm canonical route and redirect behavior. |

## Auth pages and actions

| Method | URI | Name | Controller/action | Middleware | Auth required | State-changing | CSRF/session expectation | Request-limit expectation | Smoke coverage | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/login` | TBD | TBD | TBD | No | No | Session may be started | Auth page limit | Needs auth page smoke | Fill from route:list. |
| POST | `/login` | TBD | TBD | TBD | No | Yes | CSRF/session expected for browser form | Login throttle expected | Needs negative audit | Do not leak user enumeration. |
| GET | `/register` | TBD | TBD | TBD | No | No | Session may be started | Auth page limit | Needs auth page smoke | Fill from route:list. |
| POST | `/register` | TBD | TBD | TBD | No | Yes | CSRF/session expected for browser form | Registration throttle expected | Needs negative audit | Validate input server-side. |
| POST | `/logout` | TBD | TBD | TBD | Yes | Yes | CSRF/session expected | Normal auth limit | Needs auth smoke | Session should be invalidated. |

## Account and seller actions

| Method | URI | Name | Controller/action | Middleware | Auth required | State-changing | CSRF/session expectation | Request-limit expectation | Smoke coverage | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/account` | TBD | TBD | TBD | Yes | No | Session required | Normal auth limit | Protected route smoke | Guest must not access. |
| GET | `/account/listings` | TBD | TBD | TBD | Yes | No | Session required | Pagination bounds expected | Protected route smoke | Seller sees own listings only. |
| GET | `/account/listing/{id}/edit` | TBD | TBD | TBD | Yes | No | Session required | Normal auth limit | Needs route smoke | Ownership required. |
| POST | `/account/listing/{id}/edit` | TBD | TBD | TBD | Yes | Yes | CSRF/session expected | Account action limit expected | Needs negative audit | Ownership required. |
| POST | `/account/listing/{id}/pause` | TBD | TBD | TBD | Yes | Yes | CSRF/session expected | Account action limit expected | Needs negative audit | Ownership required. |
| POST | `/account/listing/{id}/activate` | TBD | TBD | TBD | Yes | Yes | CSRF/session expected | Account action limit expected | Needs negative audit | Ownership required. |
| POST | `/account/listing/{id}/delete` | TBD | TBD | TBD | Yes | Yes | CSRF/session expected | Account action limit expected | Needs negative audit | Soft-delete expected. |

## Publish flow

| Method | URI | Name | Controller/action | Middleware | Auth required | State-changing | CSRF/session expectation | Request-limit expectation | Smoke coverage | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/publish` | TBD | TBD | TBD | Yes or guest-redirect | No | Session if authenticated | Normal page limit | Publish page smoke | Confirm current product behavior. |
| POST | `/publish` | TBD | TBD | TBD | Yes | Yes | CSRF/session expected | Publish limit expected | Needs negative audit | Validate category, city, price, contact and photos. |

## Media and photo actions

| Method | URI | Name | Controller/action | Middleware | Auth required | State-changing | CSRF/session expectation | Request-limit expectation | Smoke coverage | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/account/listing/{id}/photos` | TBD | TBD | TBD | Yes | No | Session required | Normal auth limit | Needs route smoke | Ownership required. |
| POST | `/account/listing/{id}/photos/upload` | TBD | TBD | TBD | Yes | Yes | CSRF/session expected | Upload limit expected | Needs upload audit | Image-only validation required. |
| POST | `/account/photo/{photoId}/primary` | TBD | TBD | TBD | Yes | Yes | CSRF/session expected | Account action limit expected | Needs negative audit | Ownership required. |
| POST | `/account/photo/{photoId}/move` | TBD | TBD | TBD | Yes | Yes | CSRF/session expected | Account action limit expected | Needs negative audit | Ownership required. |
| POST | `/account/photo/{photoId}/delete` | TBD | TBD | TBD | Yes | Yes | CSRF/session expected | Account action limit expected | Needs negative audit | Ownership required. |

## Catalog and API routes

| Method | URI | Name | Controller/action | Middleware | Auth required | State-changing | CSRF/session expectation | Request-limit expectation | Smoke coverage | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/categories` | TBD | TBD | TBD | No | No | N/A | API read limit expected | `verify:quick` covers this | Must not return 5xx. |
| GET | `/api/ads?page=1` | TBD | TBD | TBD | No | No | N/A | Pagination bounds expected | `verify:quick` covers this | Must not return 5xx. |
| GET | Search/catalog API route | TBD | TBD | TBD | No | No | N/A | Pagination and query bounds expected | Needs search smoke | Fill from route:list. |

## Billing and promotion pages/actions

| Method | URI | Name | Controller/action | Middleware | Auth required | State-changing | CSRF/session expectation | Request-limit expectation | Smoke coverage | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/account/billing` | TBD | TBD | TBD | Yes | No | Session required | Normal auth limit | Needs route smoke | Customer-facing billing page. |
| GET | `/account/promotions` | TBD | TBD | TBD | Yes | No | Session required | Normal auth limit | Needs route smoke | Customer-facing plan/promotion page. |
| POST | Checkout/create route | TBD | TBD | TBD | Yes | Yes | CSRF/session expected for browser action | Billing action limit expected | Needs negative audit | Server-side product data required. |
| GET | `/payment/success` | TBD | TBD | TBD | No or session optional | No | No state mutation | Normal page limit | Needs smoke | Presentation-only page. |
| GET | `/payment/fail` | TBD | TBD | TBD | No or session optional | No | No state mutation | Normal page limit | Needs smoke | Presentation-only page. |
| POST | Provider notification route | TBD | TBD | TBD | No browser auth | Yes | Documented verification expected | Provider endpoint limit expected | Needs audit | Must be documented from route:list. |

## Follow-up gap list

- [ ] Replace all TBD values with real route data.
- [ ] Mark actual middleware for every route.
- [ ] Confirm protected account routes reject guests.
- [ ] Confirm state-changing browser routes have CSRF/session strategy.
- [ ] Confirm upload routes have file validation and ownership checks.
- [ ] Confirm catalog/API routes have pagination bounds.
- [ ] Confirm billing return pages are presentation-only.
- [ ] Convert every gap into a small issue or patch.

## Verification gate

After any route, middleware or smoke-script change:

```bash
cd /var/www/mercasto
docker compose -f docker-compose.yml -f docker-compose.override.yml config
npm run verify:quick
```
