#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== SEO route shell gate =="

grep -qF "class SeoShellController extends Controller" backend/app/Http/Controllers/SeoShellController.php
grep -qF "Route::get('/listings', [SeoShellController::class, 'listings']);" backend/routes/web.php
grep -qF "Route::get('/ads/{id}', [SeoShellController::class, 'ad'])->whereNumber('id');" backend/routes/web.php
grep -qF "frontend_shell_url" backend/config/app.php

grep -qF "listen 8081;" default.conf
grep -qF "location = /listings" default.conf
grep -qF "location ~ ^/ads/[0-9]+/?$" default.conf

grep -qF "window.location.pathname !== '/'" index.html
grep -qF 'id="schema-ld-json"' index.html
grep -qF "window.location.pathname === '/listings'" src/App.jsx
grep -qF '<Route path="/listings" element={renderCatalogScreen()} />' src/App.jsx
grep -qF 'alt={alt}' src/App.jsx
grep -qF "alt={localizedText(ad.title, lang) || detailCopy.imageAlt}" src/components/screens/AdDetailScreen.jsx
grep -qF 'meta[name="twitter:title"]' src/App.jsx
grep -qF '<html lang="es-MX">' index.html
# robots directives live in the shared policy module (src/utils/seoIndexability.js)
# and App.jsx must consume them, so SSR and the hydrated DOM cannot drift.
grep -qF "export const ROBOTS_PRIVATE = 'noindex,nofollow,noarchive'" src/utils/seoIndexability.js
grep -qF "export const ROBOTS_NOINDEX = 'noindex,follow,max-image-preview:large'" src/utils/seoIndexability.js
grep -qF "export const ROBOTS_INDEXABLE = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'" src/utils/seoIndexability.js
grep -qF 'ROBOTS_INDEXABLE, ROBOTS_NOINDEX, ROBOTS_PRIVATE' src/App.jsx
grep -qF "public const ROBOTS_PRIVATE = 'noindex,nofollow,noarchive'" backend/app/Support/SeoIndexability.php
grep -qF "public const ROBOTS_NOINDEX = 'noindex,follow,max-image-preview:large'" backend/app/Support/SeoIndexability.php
grep -qF 'Mercasto: compra, vende y renta en todo México' src/components/screens/HomeScreen.jsx
! grep -qF 'sitemap-states.xml' <(sed -n '/\$sitemaps = \[/,/\];/p' backend/app/Http/Controllers/Api/SitemapController.php)
grep -qF 'legacy' backend/app/Http/Controllers/Api/SitemapController.php
node scripts/vertical-seo-contract.mjs
node scripts/geo-seo-plan-contract.mjs

echo "SEO route shell gate OK"
