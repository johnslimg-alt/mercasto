import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { LOCALE_BY_LANG, formatDate, localeFor } from '../src/utils/localeFormat.js';

const source = fs.readFileSync(new URL('../src/components/screens/StorefrontScreen.jsx', import.meta.url), 'utf8');

test('storefront review dates use the shared locale contract for every active language', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    assert.ok(Object.hasOwn(LOCALE_BY_LANG, lang), `${lang} has an explicit locale`);
    const expected = new Date('2026-08-13T00:00:00').toLocaleDateString(localeFor(lang));
    assert.equal(formatDate('2026-08-13', lang), expected, `${lang} date formatting`);
  }

  assert.match(source, /formatDate\(rev\.created_at, lang\)/);
  assert.doesNotMatch(source, /lang === 'es'.*lang === 'pt'.*'en-US'/s);
});
