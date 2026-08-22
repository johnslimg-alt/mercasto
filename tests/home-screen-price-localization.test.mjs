import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { formatMXN, formatNumber } from '../src/utils/localeFormat.js';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const source = fs.readFileSync('src/components/screens/HomeScreen.jsx', 'utf8');

test('HomeScreen formats all five public price paths with the active Mercasto locale', () => {
  assert.match(source, /import \{[^}]*formatMXN[^}]*formatNumber[^}]*\} from '\.\.\/\.\.\/utils\/localeFormat'/);

  assert.match(
    source,
    /const price = formatMXN\(ad\.price \|\| 0, lang, \{\s*minimumFractionDigits: 0,\s*maximumFractionDigits: 0,?\s*\}\);/,
  );
  assert.ok(source.includes('formatNumber(job.price || 0, lang)'), 'job price');
  assert.ok(source.includes('formatNumber(srv.price || 0, lang)'), 'service price');
  assert.ok(source.includes('formatNumber(car.price || 0, lang)'), 'automotive price');
  assert.ok(source.includes('formatNumber(ad.price || 0, lang)'), 'recently viewed price');

  assert.doesNotMatch(source, /(?:ad|job|srv|car)\.price[^\n]{0,120}toLocaleString\s*\(/);
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
