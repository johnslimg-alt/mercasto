#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCREEN="$ROOT/src/components/screens/ProfileEditScreen.jsx"
BUSINESS_EDITOR="$ROOT/src/components/profile/BusinessProfileEditor.jsx"
TRANSLATIONS="$ROOT/src/constants/translations"

echo "== Profile edit localization contract gate =="
for key in delete_confirmation_word profile_save_error password_update_error profile_photo_alt; do
  for lang in es en pt fr zh ko de it ar ru ja; do
    grep -qF "${key}:" "$TRANSLATIONS/${lang}.js"
  done
done

grep -qF 'formatDateTime' "$SCREEN"
grep -qF 'deleteConfirmText !== t.delete_confirmation_word' "$SCREEN"
grep -qF 'placeholder={t.delete_confirmation_word}' "$SCREEN"
grep -qF 'role="dialog"' "$SCREEN"
grep -qF 'aria-modal="true"' "$SCREEN"

for file in "$SCREEN" "$BUSINESS_EDITOR"; do
  if grep -Eq 'data\.(message|error|errors)' "$file"; then
    echo "Profile edit surfaces must not surface backend-localized human messages" >&2
    exit 1
  fi
done
if grep -qF "deleteConfirmText !== 'ELIMINAR'" "$SCREEN"; then
  echo "Profile delete confirmation token must be localized" >&2
  exit 1
fi
for file in "$SCREEN" "$BUSINESS_EDITOR"; do
  if grep -Eq "t\.[A-Za-z0-9_]+[[:space:]]*\|\|" "$file"; then
    echo "Profile edit surfaces must not rely on inline language fallbacks" >&2
    exit 1
  fi
done

echo "profile edit localization contract gate OK"
