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
grep -qF '<Route path="/listings" element={renderHomeScreen()} />' src/App.jsx
grep -qF 'alt={alt}' src/App.jsx
grep -qF "alt={localizedText(ad.title, lang) || 'Imagen del anuncio'}" src/components/screens/AdDetailScreen.jsx
grep -qF 'meta[name="twitter:title"]' src/App.jsx

echo "SEO route shell gate OK"
