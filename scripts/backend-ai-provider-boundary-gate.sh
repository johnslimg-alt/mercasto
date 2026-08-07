#!/usr/bin/env bash
set -euo pipefail

ROUTES="backend/routes/api.php"
SERVICES="backend/config/services.php"
DEAD_CONTROLLER="backend/app/Http/Controllers/Api/AiController.php"
DESCRIPTION="backend/app/Http/Controllers/Api/AiDescriptionController.php"

echo "== Backend AI provider boundary gate =="

test ! -e "$DEAD_CONTROLLER"
test -f "$DESCRIPTION"
grep -qF 'AiDescriptionController::class' "$ROUTES"
if grep -RInE --include='*.php' 'api[.]anthropic[.]com|ANTHROPIC_API_KEY|services[.]anthropic' backend/app backend/config backend/routes; then
  echo "FAIL: Anthropic runtime execution/config returned to the backend" >&2
  exit 1
fi
if grep -qF "'anthropic' =>" "$SERVICES"; then
  echo "FAIL: unused Anthropic backend service config returned" >&2
  exit 1
fi

echo "backend AI provider boundary gate OK"
