import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { formatMXN, formatNumber } from '../src/utils/localeFormat.js';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const source = fs.readFileSync('src/components/home/MercastoGoldenHome.jsx', 'utf8');

test('redesigned HomeScreen localizes public ad titles and prices', () => {
  assert.match(source, /import \{ formatMXN \} from '\.\.\/\.\.\/utils\/localeFormat'/);
  assert.match(source, /import \{ localizedText \} from '\.\.\/\.\.\/utils\/localize'/);
  assert.match(source, /localizedText\(ad\?\.title,lang\)/);
  assert.match(source, /formatMXN\(price,lang,\{minimumFractionDigits:0,maximumFractionDigits:0\}\)/);
  assert.doesNotMatch(source, /toLocaleString\(\s*['"]es-MX['"]/);
});
test('shared HomeScreen price formatters support exactly the 11 active runtime languages', () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 11);
  assert.equal(SUPPORTED_LANGUAGES.includes('he'), false);
  assert.equal(SUPPORTED_LANGUAGES.includes('yi'), false);

  for (const lang of SUPPORTED_LANGUAGES) {
    const currency = formatMXN(1234567.89, lang, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const number = formatNumber(1234567.89, lang, { maximumFractionDigits: 2 });

    assert.ok(String(currency).trim(), `${lang} currency`);
    assert.ok(String(number).trim(), `${lang} number`);
    assert.notEqual(currency, 'NaN', `${lang} currency`);
    assert.notEqual(number, 'NaN', `${lang} number`);
  }
});
