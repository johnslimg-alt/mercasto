#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
SERVICE='backend/app/Services/GamificationService.php'
TEST='backend/tests/Feature/GamificationPhotoProgressTest.php'
for file in "$SERVICE" "$TEST"; do test -f "$file"; done
if grep -qF -- "->whereNotNull('images')" "$SERVICE"; then
  echo 'FAIL: gamification must not query nonexistent ads.images' >&2
  exit 1
fi
grep -qF -- "->whereNotNull('image_url')" "$SERVICE"
grep -qF -- "->where('generated_cover', false)" "$SERVICE"
grep -qF 'test_photo_progress_counts_only_real_listing_images' "$TEST"
echo 'gamification photo contract gate OK'
