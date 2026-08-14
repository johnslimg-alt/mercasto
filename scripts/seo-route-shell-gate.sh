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
grep -qF "'noindex,nofollow,noarchive'" src/App.jsx
grep -qF "'noindex,follow,max-image-preview:large'" src/App.jsx
grep -qF 'Mercasto: compra, vende y renta en todo México' src/components/screens/HomeScreen.jsx
! grep -qF 'sitemap-states.xml' <(sed -n '/\$sitemaps = \[/,/\];/p' backend/app/Http/Controllers/Api/SitemapController.php)
grep -qF 'legacy' backend/app/Http/Controllers/Api/SitemapController.php
node scripts/vertical-seo-contract.mjs
node scripts/geo-seo-plan-contract.mjs

echo "SEO route shell gate OK"
