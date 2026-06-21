#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ROUTES="backend/routes/api.php"
CONTROLLER="backend/app/Http/Controllers/Api/AdController.php"
POST_SCREEN="src/components/screens/PostScreen.jsx"
DETAIL_SCREEN="src/components/screens/AdDetailScreen.jsx"

echo "== Listing lifecycle launch gate =="

test -f "$ROUTES"
test -f "$CONTROLLER"
test -f "$POST_SCREEN"
test -f "$DETAIL_SCREEN"

# Route coverage: create, edit data, update, delete, status, report, moderation, owner dashboard.
grep -qF "Route::middleware('throttle:ads')->post('/ads', [AdController::class, 'store'])" "$ROUTES"
grep -qF "Route::get('/ads/{id}/edit', [AdController::class, 'editForm'])->whereNumber('id')" "$ROUTES"
grep -qF "Route::post('/ads/{ad}', [AdController::class, 'update'])->whereNumber('ad')" "$ROUTES"
grep -qF "Route::delete('/ads/{id}', [AdController::class, 'destroy'])->whereNumber('id')" "$ROUTES"
grep -qF "Route::patch('/ads/{id}/status', [AdController::class, 'updateStatus'])->whereNumber('id')" "$ROUTES"
grep -qF "Route::post('/ads/{id}/report', [AdController::class, 'report'])->whereNumber('id')" "$ROUTES"
grep -qF "Route::get('/admin/ads/pending', [AdController::class, 'pendingAds'])" "$ROUTES"
grep -qF "Route::get('/admin/reports', [AdController::class, 'getReports'])" "$ROUTES"
grep -qF "Route::get('/user/ads', [AdController::class, 'myAds'])" "$ROUTES"

# Public active-only / IDOR protection.
grep -qF 'if ($ad->status !== '\''active'\'')' "$CONTROLLER"
grep -qF "return response()->json(['message' => 'Anuncio no disponible o en revisión'], 403)" "$CONTROLLER"
grep -qF "where('ads.status', 'active')" "$CONTROLLER"

# Ownership guards for edit/update/delete/status/promote.
grep -qF '$request->user()->id !== $ad->user_id && $request->user()->role !== '\''admin'\''' "$CONTROLLER"
grep -qF "No tienes permisos para editar este anuncio" "$CONTROLLER"
grep -qF "No tienes permisos para eliminar este anuncio" "$CONTROLLER"
grep -qF "No tienes permisos para cambiar el estado de este anuncio" "$CONTROLLER"

# Create/edit moderation behavior.
grep -qF "'status' => 'pending', // Отправляем на модерацию" "$CONTROLLER"
grep -qF '$needsReModeration ? '\''pending'\'' : $ad->status' "$CONTROLLER"
grep -qF "No puedes activar un anuncio en revisión o rechazado." "$CONTROLLER"

# Media and upload hardening.
grep -qF "'images' => 'nullable|array|max:10'" "$CONTROLLER"
grep -qF "'images.*' => 'file|mimes:jpg,jpeg,png,webp,gif|max:5120|dimensions:max_width=4096,max_height=4096'" "$CONTROLLER"
grep -qF "'video_file' => 'nullable|file|mimetypes:video/mp4,video/quicktime|max:51200'" "$CONTROLLER"
grep -qF "scaleDown(width: 1200, height: 1200)" "$CONTROLLER"
grep -qF "ProcessVideoWatermark::dispatch" "$CONTROLLER"
grep -qF "No puedes tener más de 10 imágenes en total por anuncio." "$CONTROLLER"

# Report and admin moderation gates.
grep -qF 'public function report(Request $request, $id)' "$CONTROLLER"
grep -qF "DB::table('reports')->insert" "$CONTROLLER"
grep -qF 'public function pendingAds(Request $request)' "$CONTROLLER"
grep -qF 'public function getReports(Request $request)' "$CONTROLLER"
grep -qF "Acceso denegado" "$CONTROLLER"

# Cache invalidation after mutating listing operations.
grep -qF "Cache::forget('sitemap_xml')" "$CONTROLLER"
grep -qF "Cache::forget('google_merchant_xml')" "$CONTROLLER"
grep -qF "ads_index_page_" "$CONTROLLER"

# Frontend flow has create/edit form media, dynamic attributes, map preview, and report/contact detail actions.
grep -qF "SortablePhotoGrid" "$POST_SCREEN"
grep -qF "handleGenerateDescription" "$POST_SCREEN"
grep -qF "category-attributes" "$POST_SCREEN"
grep -qF "MapV3" "$POST_SCREEN"
grep -qF "Reportar anuncio sospechoso" "$DETAIL_SCREEN"
grep -qF "Ubicación del anuncio" "$DETAIL_SCREEN"
# Contact channels may be inline (legacy) or encapsulated in ContactButton
grep -qE "Escribir por Telegram|ContactButton" "$DETAIL_SCREEN"

echo "listing lifecycle launch gate OK"
