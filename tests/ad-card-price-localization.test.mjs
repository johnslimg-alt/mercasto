import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { formatNumber } from '../src/utils/localeFormat.js';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const source = fs.readFileSync('src/components/common/AdCard.jsx', 'utf8');
const app = fs.readFileSync('src/App.jsx', 'utf8');

test('listing cards format public prices with the active Mercasto locale', () => {
  assert.match(source, /import \{ formatNumber \} from '\.\.\/\.\.\/utils\/localeFormat';/);
  assert.match(source, /\$\{formatNumber\(ad\.price, lang\)\}/);
  assert.doesNotMatch(source, /ad\.price\)\.toLocaleString\(/);
  assert.match(app, /<AdCard[\s\S]*?lang=\{lang\}/);
});

test('listing card number formatting supports exactly the 11 active languages', () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 11);
  assert.equal(SUPPORTED_LANGUAGES.includes('he'), false);
  assert.equal(SUPPORTED_LANGUAGES.includes('yi'), false);
  for (const lang of SUPPORTED_LANGUAGES) {
    const value = formatNumber(1234567.89, lang, { maximumFractionDigits: 2 });
    assert.ok(String(value).trim(), lang);
    assert.notEqual(value, 'NaN', lang);
  }
});
