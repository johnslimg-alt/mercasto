#!/usr/bin/env bash
set -euo pipefail

SERVICE="backend/app/Services/SupplyReadinessService.php"
COMMAND="backend/app/Console/Commands/SupplyReadinessReport.php"
CONFIG="backend/config/marketplace.php"
TEST="backend/tests/Feature/SupplyReadinessReportTest.php"

for file in "$SERVICE" "$COMMAND" "$CONFIG" "$TEST"; do
  test -f "$file"
done

grep -qF -- "->where('is_catalog_filler', false)" "$SERVICE"
grep -qF "'ready_for_seller_confirmation'" "$SERVICE"
grep -qF "'moderation_backlog'" "$SERVICE"
grep -qF "'location_completeness_percent'" "$SERVICE"
grep -qF "'qualified'" "$SERVICE"
grep -qF "ads:supply-readiness" "$COMMAND"
grep -qF "{--json : Emit machine-readable JSON}" "$COMMAND"
grep -qF "'supply_readiness'" "$CONFIG"
grep -qF "assertStringNotContainsString('user_id'" "$TEST"
grep -qF "assertStringNotContainsString('title'" "$TEST"
grep -qF "assertStringNotContainsString('description'" "$TEST"

if grep -Eq "select\(.*(name|email|phone|title|description)" "$SERVICE"; then
  echo "Supply report selects personal or listing content" >&2
  exit 1
fi

echo "supply readiness gate OK"
