#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CONTROLLER="backend/app/Http/Controllers/Api/AdminSeoMeasurementController.php"
ROUTES="backend/routes/api.php"
SCREEN="src/components/screens/AdminScreen.jsx"
COMPONENT="src/components/admin/AdminSeoMeasurement.jsx"
TEST="backend/tests/Feature/AdminSeoMeasurementTest.php"

echo "== Admin SEO measurement gate =="

grep -qF -- "Route::get('/admin/seo-measurement', AdminSeoMeasurementController::class)" "$ROUTES"
grep -qF -- "class AdminSeoMeasurementController extends Controller" "$CONTROLLER"
grep -qF -- "privacy_contract' => 'aggregate_only'" "$CONTROLLER"
grep -qF -- "private function safeReport" "$CONTROLLER"
grep -qF -- "private function internalMetricKeys" "$CONTROLLER"

grep -qF -- "AdminSeoMeasurement" "$SCREEN"
grep -qF -- "setAdminTab('seo_geo')" "$SCREEN"
grep -qF -- "adminTab === 'seo_geo'" "$SCREEN"
grep -qF -- "/admin/seo-measurement?limit=12" "$COMPONENT"
grep -qF -- "GEO local permanece bloqueado" "$COMPONENT"
grep -qF -- "No se abrirán páginas de estado o ciudad" "$COMPONENT"
grep -qF -- "test_non_admin_cannot_read_seo_measurement_snapshots" "$TEST"
grep -qF -- "test_admin_receives_only_whitelisted_aggregate_snapshot_data" "$TEST"
grep -qF -- "assertStringNotContainsString('hidden@example.com'" "$TEST"
grep -qF -- "assertStringNotContainsString('private_key'" "$TEST"
grep -qF -- "assertStringNotContainsString('full_referrer_url'" "$TEST"

if grep -qE "method:[[:space:]]*['\"](POST|PUT|PATCH|DELETE)" "$COMPONENT"; then
  echo "SEO measurement admin UI must remain read-only" >&2
  exit 1
fi

echo "Admin SEO measurement gate OK"
