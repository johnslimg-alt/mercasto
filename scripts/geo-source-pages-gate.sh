#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== GEO source pages gate =="

CONFIG="backend/config/seo_source_pages.php"
CONTROLLER="backend/app/Http/Controllers/SeoShellController.php"
ROUTES="backend/routes/web.php"
SITEMAP="backend/app/Http/Controllers/Api/SitemapController.php"
APP="src/App.jsx"
PAGE="src/components/screens/GeoSourcePage.jsx"
CONTENT="src/content/geoSourcePages.js"
LOCALES="src/content/geoSourcePageLocales.js"
DOC="docs/seo/GEO_SOURCE_PAGES_2026-08-05.md"

for path in \
  como-funciona \
  seguridad \
  ayuda/publicar-anuncio \
  ayuda/comprar-y-contactar \
  tarifas \
  sobre-mercasto; do
  grep -qF "'$path' => [" "$CONFIG"
  grep -qF "Route::get('/$path', [SeoShellController::class, 'source']);" "$ROUTES"
  grep -qF "path=\"/$path\"" "$APP"
  grep -qF "path: '/$path'" "$CONTENT"
  grep -qF "'$path' => ['monthly'" "$SITEMAP"
done

grep -qF 'public function source(Request $request): Response' "$CONTROLLER"
grep -qF "'@type' => 'Organization'" "$CONTROLLER"
grep -qF "'@type' => 'BreadcrumbList'" "$CONTROLLER"
grep -qF "'dateModified' => config('seo_source_pages.updated_at')" "$CONTROLLER"
grep -qF 'Location pages remain fail-closed' "$DOC"
grep -qF "id = 'geo-source-schema'" "$PAGE"
grep -qF "'@type': 'FAQPage'" "$PAGE"
grep -qF 'getGeoSourcePage(slug, lang)' "$PAGE"
grep -qF 'getGeoSourceShellCopy(lang)' "$PAGE"
grep -qF "lang === 'es' ? 'es-MX' : lang" "$PAGE"
grep -qF 'availableLanguage: [schemaLanguage]' "$PAGE"
grep -qF 'GEO_SOURCE_PAGE_LOCALES' "$LOCALES"
grep -qF "'es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja'" "$CONTENT"
grep -qF 'location ~ ^/(como-funciona|seguridad|tarifas|sobre-mercasto|ayuda/publicar-anuncio|ayuda/comprar-y-contactar)/?$' default.conf
grep -qF 'location = /safety { return 301 /seguridad; }' default.conf
grep -qF 'location = /acerca-de { return 301 /sobre-mercasto; }' default.conf

# Canonical Spanish facts remain the source of truth; localized copies are contract-tested below.
grep -qF 'Publicación inicial: 0 MXN por 7 días.' "$CONTENT"
grep -qF 'Renovación: 49 MXN por 7 días adicionales.' "$CONTENT"
grep -qF 'Mercasto no recibe el pago de la compraventa entre particulares.' "$CONTENT"
grep -qF 'Las páginas locales solo deben indexarse cuando cumplen los umbrales publicados.' "$CONTENT"

node --test tests/geo-source-localization.test.mjs

BANNED='portal líder|marketplace líder|más rápido crecimiento|fastest-growing|moderación 24/7|24/7 moderation|garantizar transacciones seguras|guarantee safe transactions|más de 200 ciudades|200 cities|fotos ilimitadas|unlimited photos|todos los vendedores|all sellers|PRO desde \$99|PRO from \$99|\$499 MXN/mes|Enterprise \(\$1,999|visible para miles|reseñas del vendedor'
if grep -RInE --exclude-dir=node_modules --exclude-dir=vendor --exclude='*.map' "$BANNED" src backend/app backend/resources; then
  echo "unsupported public trust or pricing claim found" >&2
  exit 1
fi

echo "GEO source pages gate OK"
