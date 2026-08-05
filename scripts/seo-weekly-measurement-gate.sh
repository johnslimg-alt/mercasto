#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMMAND="backend/app/Console/Commands/SeoWeeklyMeasurement.php"
SERVICE="backend/app/Services/SeoWeeklyMeasurementService.php"
GOOGLE="backend/app/Services/GoogleSeoReportingService.php"
MODEL="backend/app/Models/SeoMeasurementSnapshot.php"
SCHEDULE="backend/routes/console.php"
TEST="backend/tests/Feature/SeoWeeklyMeasurementTest.php"
RUNBOOK="docs/seo/WEEKLY_MEASUREMENT_RUNBOOK.md"

echo "== SEO weekly measurement gate =="

grep -qF -- "seo:weekly-measurement" "$COMMAND"
grep -qF -- "--require-external" "$COMMAND"
grep -qF -- "Privacy scan failed" "$COMMAND"
grep -qF -- "whereDate('period_start'" "$COMMAND"
grep -qF -- "whereDate('period_end'" "$COMMAND"
grep -qF -- "SeoMeasurementSnapshot::query()->create" "$COMMAND"

grep -qF -- "where('is_catalog_filler', false)" "$SERVICE"
grep -qF -- "indexable_genuine_listing_urls" "$SERVICE"
grep -qF -- "active_catalog_references_noindex" "$SERVICE"
grep -qF -- "privacy_hits" "$SERVICE"
grep -qF -- "full_referrer_url" "$SERVICE"

grep -qF -- "webmasters.readonly" "$GOOGLE"
grep -qF -- "analytics.readonly" "$GOOGLE"
grep -qF -- "provider_request_failed" "$GOOGLE"
grep -qF -- "GOOGLE_REPORTING_SERVICE_ACCOUNT_PATH" "$RUNBOOK"
grep -qF -- "GOOGLE_SEARCH_CONSOLE_SITE_URL" "$RUNBOOK"
grep -qF -- "GOOGLE_ANALYTICS_PROPERTY_ID" "$RUNBOOK"

grep -qF -- "class SeoMeasurementSnapshot extends Model" "$MODEL"
grep -qF -- "seo:weekly-measurement --days=7 --store --json" "$SCHEDULE"
grep -qF -- "weeklyOn(1, '08:15')" "$SCHEDULE"
grep -qF -- "test_report_counts_only_genuine_inventory_and_contains_no_personal_data" "$TEST"
grep -qF -- "test_command_stores_one_idempotent_snapshot_and_strict_mode_fails_closed" "$TEST"

echo "SEO weekly measurement gate OK"
