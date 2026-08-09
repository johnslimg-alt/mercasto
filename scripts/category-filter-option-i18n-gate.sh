#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== Category filter option localization gate =="
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { filterConfig } from './src/constants/filterConfig.js';
import {
  FILTER_OPTION_LANGUAGES,
  filterOptionLabel,
  filterOptionValue,
  loadFilterOptionLanguage,
} from './src/utils/filterOptionTranslations.js';
import { SUPPORTED_LANGUAGES } from './src/utils/translations.js';

const targetLanguages = SUPPORTED_LANGUAGES.filter((lang) => lang !== 'es');
assert.deepEqual(FILTER_OPTION_LANGUAGES, targetLanguages);

const pairs = new Map();
for (const config of Object.values(filterConfig)) {
  if (!Array.isArray(config)) continue;
  for (const field of config) {
    if (!Array.isArray(field.options)) continue;
    const fieldId = field.id || field.key;
    for (const option of field.options) {
      const value = filterOptionValue(option);
      if (value) pairs.set(`${fieldId}\0${value}`, { fieldId, value });
    }
  }
}

const brandPassthrough = new Set(
  [...pairs.values()]
    .filter(({ fieldId, value }) => fieldId === 'marca' && value !== 'Otra')
    .map(({ fieldId, value }) => `${fieldId}\0${value}`),
);
const expectedTranslated = new Set([...pairs.keys()].filter((key) => !brandPassthrough.has(key)));

for (const lang of targetLanguages) {
  const module = await import(`./src/constants/filterOptionTranslations/${lang}.js`);
  const table = module.default || {};
  const actual = new Set();
  for (const [fieldId, options] of Object.entries(table)) {
    for (const [value, label] of Object.entries(options)) {
      const key = `${fieldId}\0${value}`;
      actual.add(key);
      assert.equal(typeof label, 'string', `${key}:${lang} must be string`);
      assert.ok(label.trim(), `${key}:${lang} must be non-empty`);
      assert.ok(!/ZX\d{3}|\|\|\|/.test(label), `${key}:${lang} leaked generator context`);
    }
  }
  assert.deepEqual([...actual].sort(), [...expectedTranslated].sort(), `${lang} coverage drift`);
  await loadFilterOptionLanguage(lang);
  for (const { fieldId, value } of pairs.values()) {
    assert.equal(filterOptionLabel(fieldId, value, 'es'), value, `${fieldId}:${value} changed Spanish canonical`);
    if (brandPassthrough.has(`${fieldId}\0${value}`)) {
      assert.equal(filterOptionLabel(fieldId, value, lang), value, `${fieldId}:${value}:${lang} brand changed`);
    } else {
      assert.equal(filterOptionLabel(fieldId, value, lang), table[fieldId][value], `${fieldId}:${value}:${lang} cache mismatch`);
    }
  }
}

assert.equal(pairs.size, 810);
assert.equal(brandPassthrough.size, 97);
assert.equal(expectedTranslated.size, 713);
assert.equal(filterOptionLabel('marca', 'Otra', 'en'), 'Other');
assert.equal(filterOptionLabel('uso', 'Flotilla', 'en'), 'Fleet');
assert.equal(filterOptionLabel('incluye', 'Mica', 'en'), 'Screen protector');
assert.equal(filterOptionLabel('incluye_negocio', 'Local', 'en'), 'Premises');
assert.equal(filterOptionLabel('tipo_vehiculo', 'Кемперы / RVs', 'ru'), 'Кемперы/дома на колесах');

console.log(`pairs=${pairs.size} translated=${expectedTranslated.size} brand_passthrough=${brandPassthrough.size} target_languages=${targetLanguages.length}`);
NODE

echo "category filter option localization gate OK"

for file in \
  src/components/common/SidebarFilters.jsx \
  src/components/common/MapV3.jsx \
  src/components/screens/PostScreen.jsx \
  src/components/screens/EditAdScreen.jsx; do
  grep -qF 'filterOptionDisplayLabel' "$file"
done
grep -qF 'copy={t}' src/components/common/SplitViewContainer.jsx
grep -qF 'productLang={lang}' src/components/common/SplitViewContainer.jsx
grep -qF 'loadFilterOptionLanguage(lang)' src/utils/translations.js

echo "category filter option UI wiring OK"
