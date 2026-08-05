# Mercasto weekly SEO measurement

The command `php artisan seo:weekly-measurement --days=7 --store --json` creates one privacy-safe rolling snapshot. It runs every Monday at 08:15 in `America/Mexico_City`, after the weekly digest.

## Internal metrics

The report is available without external credentials and includes only aggregate counts:

- new and verified users;
- genuine ads created and first-time publishers;
- genuine listing views and contact clicks;
- registration-to-first-publication and view-to-contact rates;
- genuine supply readiness and indexability;
- catalog references held outside search indexing;
- queue and failed-job counts.

Catalog filler is excluded from publication, view, contact, supply, and indexable-listing metrics. The report never emits names, email addresses, phone numbers, user or seller IDs, IP addresses, listing text, full referrer URLs, or query strings. A key-level privacy scan must pass before a snapshot can be stored.

## Optional Google read-only reporting

Install one Google service-account JSON file outside the repository and configure:

```dotenv
GOOGLE_REPORTING_SERVICE_ACCOUNT_PATH=/run/secrets/google-reporting.json
GOOGLE_SEARCH_CONSOLE_SITE_URL=sc-domain:mercasto.com
GOOGLE_ANALYTICS_PROPERTY_ID=123456789
```

Grant the service-account email read-only access to the Search Console property and Viewer access to the GA4 property. Do not commit or print the JSON file. The application requests only the `webmasters.readonly` and `analytics.readonly` scopes.

Without these values, the command succeeds with `not_configured` external sections. Use `--require-external` when an operational check must fail unless both APIs return successfully.

## External aggregates

When configured, Search Console contributes total clicks, impressions, CTR, average position, and sitemap submitted/indexed totals. GA4 contributes Organic Search sessions/users, normalized AI-referral session sources, and bounded funnel event counts.

No Search Console query terms, page-level rows, GA4 client identifiers, full referrers, or event payloads are persisted.

## Commands

```bash
php artisan seo:weekly-measurement
php artisan seo:weekly-measurement --days=7 --json
php artisan seo:weekly-measurement --days=7 --store --json
php artisan seo:weekly-measurement --days=7 --require-external
```

Stored snapshots are idempotent per `period_start` and `period_end`; rerunning the same reporting date range replaces that snapshot instead of creating duplicates.
