# `ads.views` provenance and views reporting

## What `ads.views` is

`ads.views` is **not a measurement**. It is a legacy counter column
(`backend/database/migrations/2026_04_15_000003_add_views_to_ads_table.php:13`,
`unsignedInteger('views')->default(0)`) whose production contents are
**99.90% synthetic demo data**:

| Source | Rows | Sum of `views` | Evidence |
| --- | --- | --- | --- |
| `SeedLotsOfAds` (`ads:seed-lots`) | 4,900 | 11,007,552 | `backend/app/Console/Commands/SeedLotsOfAds.php:272` — `'views' => rand(10, 4500)`, all rows created 2026-06 |
| `TestAdsSeeder` | 597 | 1,017,340 | `backend/database/seeders/TestAdsSeeder.php:234` — `'views' => rand(15, 3500)`, all rows created 2026-05-30 |
| Everything else | 409 | 11,779 | remaining ads |
| **Total** | **5,906** | **12,036,671** | production `SELECT` (read-only), 2026-09-12 |

The fingerprints are unambiguous:

- 5,619 of 5,906 ads carry a value inside `[10, 4500]`, summing 12,032,030 — i.e. **99.96% of the
  headline sits inside the exact `rand(10, 4500)` band** of the seeding command.
- The minimum non-zero value is exactly `10` (the `rand()` lower bound) and the maximum is
  `4501` (a seeded `4500` plus one genuine increment).
- Ads matching the seeder description signature are the only large contributors; a marketplace
  with this little traffic cannot have an average of ~2,038 views per ad.

Two mechanisms wrote these rows into production:

1. `ads:seed-lots` had **no environment guard at all** (now fixed: it refuses to run in
   production without `--force`).
2. `TestAdsSeeder` has had a production guard since 2026-04-20
   (`backend/database/seeders/TestAdsSeeder.php:15-18`), yet 597 rows carrying its exact
   signature were created on 2026-05-30. **How they got in is UNKNOWN** — the most likely
   explanations are `APP_ENV` not being `production` when the seeder ran, or demo rows being
   imported from another database. It is *not* established which.

## What is measured

| Table | Meaning | Production rows |
| --- | --- | --- |
| `ad_views` | accepted individual listing views (1 per IP per hour, see `AdController::recordView`) | 2,995 |
| `ad_impressions` | listing impressions | 14,798 |
| `ad_clicks` | seller-contact clicks | 1 |

`AdController::recordView` (`backend/app/Http/Controllers/Api/AdController.php:1518-1565`)
increments `ads.views` and inserts the `ad_views` row **in the same branch**, so every
legitimate increment has (or had) a matching log row. `ad_views` is never pruned on a
schedule — rows disappear only when an ad or an account is deleted
(`AdController.php:1193`, `:2682`, `AccountDeletionController.php:84`, `ProfileController.php:574`).
A 12-million counter therefore cannot be explained by retention.

## What the reporting now does

- `GET /api/admin/analytics` (`AdminAnalyticsController.php`): `total_views` is
  `COUNT(ad_views)`; `total_views_period` counts the requested window; `total_views_source` is
  `ad_views` and `total_views_verified` is `true`. The old figure is still published — as
  `total_views_legacy_counter` with `total_views_legacy_counter_verified: false` and a Spanish
  note — so the number is visible but can never be mistaken for a KPI.
- `GET /api/seller/stats` (`SellerStatsController.php`): the same provenance fields scoped to
  the caller's ads, plus `views_series_source` (`ad_views` or `none`).
- The fabricated 7-day fallback that distributed `sum(ads.views)` evenly across the week has
  been **removed**: an unmeasured day is reported as `0`, and `views_series_source: none` says
  so explicitly.
- The seller dashboard card (`src/components/screens/UserDashboard.jsx`) reads the measured
  server aggregate instead of summing `ad.views` client-side, and its week-over-week badge is
  computed from `views_this_week`/`views_last_week`. The previously hardcoded `+12%` (views) and
  `+8%` (contacts) badges are gone.

## What is deliberately NOT changed

- **Ranking.** `ads.views` still feeds `sort=popular`
  (`AdController.php:424`), recommendations (`AdController.php:2198`),
  `SellerStatsController`, `DemandForecastingService` and `CollaborativeFilteringService`.
  Rewriting the column would silently reorder search results and change AI inputs.
- **Data.** No historical `ads.views` value was modified, and no migration touches the column.

## Plan for the operator (not executed here)

Rebuilding the counter is a data mutation and needs an explicit decision:

1. Decide the target meaning: "lifetime accepted views" (`COUNT(ad_views)` per ad) is the only
   definition with a measurement trail. Note the log starts around 2026-04-15, so a rebuild
   cannot recover anything older.
2. Freeze ranking sensitivity first: snapshot `sort=popular` ordering and recommendation output
   before and after a proposed rebuild, and decide whether the reordering is acceptable.
3. If approved: back up `ads` (or the `id, views` pair), then rebuild in a transaction from
   `ad_views`, keeping the old column in a new `views_legacy_demo` column rather than dropping it.
4. Until then, treat `ads.views` as demo data in any analysis and use `ad_views` for views.

Because the ranking path and the reporting path read the same column, this report deliberately
prefers honest reporting over a silent data rewrite.
