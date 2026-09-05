#!/usr/bin/env bash
set -euo pipefail

CONTROLLER="backend/app/Http/Controllers/Api/AdController.php"

echo "== AI agent predefined-action safety gate =="

test -f "$CONTROLLER"
grep -qF "'ads_summary_by_status'" "$CONTROLLER"
grep -qF "'ads_by_category'" "$CONTROLLER"
grep -qF "'top_ads_by_views'" "$CONTROLLER"
grep -qF "'recent_ads'" "$CONTROLLER"
grep -qF "'user_growth'" "$CONTROLLER"
grep -qF "'clicks_by_channel'" "$CONTROLLER"
grep -qF 'parsePostgresAgentCommand' "$CONTROLLER"
grep -qF 'requireOnlyAgentArgs' "$CONTROLLER"
grep -qF 'boundedAgentInt' "$CONTROLLER"

if grep -qE 'safeAgentSelectSql|runAgentSelect|DB::select\(' "$CONTROLLER"; then
  echo "FAIL: model-generated SQL execution path is present in AdController" >&2
  exit 1
fi

if grep -qF 'Generate read-only SQL' "$CONTROLLER"; then
  echo "FAIL: PostgreSQL agent still asks the model to generate SQL" >&2
  exit 1
fi

echo "AI agent predefined-action safety gate OK"
