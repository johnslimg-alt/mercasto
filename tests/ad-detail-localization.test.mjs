import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { canonicalAdCondition, formatAdDetailCopy, getAdDetailCopy, hasAdDetailCopyLanguage } from '../src/utils/adDetailCopy.js';

const source = fs.readFileSync(new URL('../src/components/screens/AdDetailScreen.jsx', import.meta.url), 'utf8');
const required = [
  'edit', 'expired', 'expiringOne', 'expiringMany', 'renew', 'imageAlt',
  'catalogTitle', 'catalogBody', 'publishSimilar', 'comments', 'views',
  'priceDropped', 'before', 'less', 'approximateLocation', 'mapPlaceholder',
  'sellTitle', 'sellBody', 'publishFree', 'loginToMessageHint', 'loginToMessage', 'user', 'verifiedSeller',
  'memberSince', 'allMexico', 'mexico',
];

test('ad detail copy explicitly covers every active language', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    assert.equal(hasAdDetailCopyLanguage(lang), true, `${lang} explicit coverage`);
    const copy = getAdDetailCopy(lang);
    for (const key of required) assert.ok(String(copy[key] || '').trim(), `${lang}.${key}`);
    assert.ok(!formatAdDetailCopy(copy.expiringMany, { date: 'DATE', days: 4 }).includes('{'));
    assert.ok(!formatAdDetailCopy(copy.memberSince, { year: 2026 }).includes('{'));
  }
  assert.equal(hasAdDetailCopyLanguage('he'), false);
  assert.equal(hasAdDetailCopyLanguage('yi'), false);
});

test('ad detail screen uses shared locale and filter contracts instead of Spanish-only rendering', () => {
  assert.match(source, /getAdDetailCopy\(lang\)/);
  assert.match(source, /formatDate\(exp, lang/);
  assert.match(source, /formatDate\(ad\.created_at, lang\)/);
  assert.match(source, /formatNumber\(ad\.price, lang\)/);
  assert.match(source, /filterOptionLabel\('condicion', canonicalAdCondition\(ad\.condition\), lang\)/);
  assert.match(source, /t\[`filter_label_\$\{key\}`\]/);
  assert.match(source, /filterOptionLabel\(key, val, lang\)/);

  for (const spanishOnly of [
    'Este anuncio ha expirado y no es visible para otros usuarios.',
    'Referencia de catálogo Mercasto',
    'Bajó de precio',
    'La ubicación es aproximada y se muestra solo con datos públicos del anuncio.',
    'Vendes este producto o uno parecido?',
  ]) {
    assert.equal(source.includes(spanishOnly), false, `screen must not hardcode: ${spanishOnly}`);
  }
});

test('ad detail condition normalization matches the canonical filter vocabulary', () => {
  assert.equal(canonicalAdCondition('usado'), 'Usado');
  assert.equal(canonicalAdCondition('used'), 'Usado');
  assert.equal(canonicalAdCondition('nuevo'), 'Nuevo');
  assert.equal(canonicalAdCondition('refurbished'), 'Reacondicionado');
  assert.equal(canonicalAdCondition('como nuevo'), 'Como nuevo');
});
