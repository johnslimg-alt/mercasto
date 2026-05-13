#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CONTROLLER="backend/app/Http/Controllers/Api/AdController.php"

command -v grep >/dev/null 2>&1 || {
  echo "grep is required" >&2
  exit 1
}

echo "== Media upload validation scan =="

test -f "$CONTROLLER"

grep -qF "'images' => 'nullable|array|max:10'" "$CONTROLLER"
grep -qF "'images.*' => 'file|mimes:jpg,jpeg,png,webp,gif|max:5120|dimensions:max_width=4096,max_height=4096'" "$CONTROLLER"
grep -qF "'video_file' => 'nullable|file|mimetypes:video/mp4,video/quicktime|max:51200'" "$CONTROLLER"
grep -qF "scaleDown(width: 1200, height: 1200)" "$CONTROLLER"
grep -qF "Storage::disk('public')->put" "$CONTROLLER"
grep -qF "Str::uuid() . '.webp'" "$CONTROLLER"
grep -qF "No puedes tener más de 10 imágenes en total por anuncio." "$CONTROLLER"

echo "media upload validation scan OK"
