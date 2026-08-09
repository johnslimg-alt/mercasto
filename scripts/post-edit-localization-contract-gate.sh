#!/usr/bin/env bash
set -euo pipefail

POST="src/components/screens/PostScreen.jsx"
EDIT="src/components/screens/EditAdScreen.jsx"

echo "== Post/Edit localization contract gate =="

grep -qF "getGlobalFilterDefinitions" "$POST"
grep -qF "getPostSubcategoryOptions(category, lang" "$POST"
grep -qF "value: 'Sin garantía', label: t.gf_no_warranty" "$POST"
grep -qF "t.post_field_required.replace('{field}'" "$POST"
grep -qF "t.ai_description_failed" "$EDIT"
grep -qF "t.save_changes_error" "$EDIT"
grep -qF "t.ai_description_generated" "$EDIT"
if grep -Eq 'data\.(message|error)|err\.message' "$POST" "$EDIT"; then
  echo "Post/Edit must not render backend human-message text" >&2
  exit 1
fi

if grep -Eq '(^|[^A-Za-z0-9_])t\.[A-Za-z0-9_]+[[:space:]]*\|\|' "$POST" "$EDIT"; then
  echo "Post/Edit must not keep inline translation fallbacks" >&2
  exit 1
fi

for literal in \
  "Selecciona una Categoría" \
  "Selecciona una Subcategoría" \
  "Usar GPS actual" \
  "Cómo te contactan?" \
  "Descripción generada ✨"; do
  if grep -qF "$literal" "$POST" "$EDIT"; then
    echo "Fixed-language UI literal remains: $literal" >&2
    exit 1
  fi
done
node --input-type=module <<'NODE'
import fs from 'node:fs';
const langs = ['es','en','pt','fr','zh','ko','de','it','ar','ru','ja'];
const sources = [
  fs.readFileSync('src/components/screens/PostScreen.jsx', 'utf8'),
  fs.readFileSync('src/components/screens/EditAdScreen.jsx', 'utf8'),
];
const keys = new Set();
for (const source of sources) {
  for (const match of source.matchAll(/\bt\.([A-Za-z0-9_]+)/g)) keys.add(match[1]);
}
for (const lang of langs) {
  const dictionary = (await import(`./src/constants/translations/${lang}.js`)).default;
  const missing = [...keys].filter((key) => !(key in dictionary));
  if (missing.length) throw new Error(`${lang} missing Post/Edit keys: ${missing.join(', ')}`);
}
console.log(`post/edit keys complete: ${keys.size} keys x ${langs.length} languages`);
NODE

echo "post/edit localization contract gate OK"
