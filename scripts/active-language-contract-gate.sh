#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== Active language contract gate =="
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RTL_LANGUAGES, SUPPORTED_LANGUAGES, normalizeLanguage } from './src/utils/translations.js';

const active = ['es','en','pt','fr','zh','ko','de','it','ar','ru','ja'];
const archived = ['he','yi'];
assert.deepEqual(SUPPORTED_LANGUAGES, active);
assert.deepEqual([...RTL_LANGUAGES], ['ar']);
for (const lang of active) assert.equal(normalizeLanguage(lang), lang);
for (const lang of archived) assert.equal(normalizeLanguage(lang), 'es');
for (const lang of active) {
  assert.ok(fs.existsSync(`src/constants/translations/${lang}.js`), `missing active runtime ${lang}`);
  assert.ok(fs.existsSync(`src/locales/${lang}.json`), `missing active JSON ${lang}`);
}
for (const lang of archived) {
  assert.ok(!fs.existsSync(`src/constants/translations/${lang}.js`), `archived runtime leaked into active path: ${lang}`);
  assert.ok(!fs.existsSync(`src/locales/${lang}.json`), `archived JSON leaked into active path: ${lang}`);
  assert.ok(fs.existsSync(`archive/disabled-languages/translations/${lang}.js`), `missing archived runtime ${lang}`);
  assert.ok(fs.existsSync(`archive/disabled-languages/locales/${lang}.json`), `missing archived JSON ${lang}`);
}
console.log(`active=${active.length} archived=${archived.length}`);
NODE

grep -qF "const DISABLED_LANGUAGES = new Set(['he', 'yi'])" src/i18n.js
grep -qF "'es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar',   'ru', 'ja'" src/App.jsx
grep -qF 'data-testid="desktop-language-select"' src/components/shell/AppHeader.jsx
grep -qF 'data-testid="mobile-language-select"' src/components/shell/AppHeader.jsx

echo "active language contract gate OK"
