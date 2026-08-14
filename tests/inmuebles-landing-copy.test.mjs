import test from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { getInmueblesLandingCopy, hasInmueblesLandingCopy } from '../src/utils/inmueblesLandingCopy.js';

test('inmuebles landing copy covers every active language', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    assert.equal(hasInmueblesLandingCopy(lang), true, lang);
    const copy = getInmueblesLandingCopy(lang);
    assert.equal(copy.operations.length, 2, `${lang}/operations`);
    assert.equal(copy.types.length, 4, `${lang}/types`);
    assert.equal(copy.subsections.length, 7, `${lang}/subsections`);
    assert.equal(copy.tips.length, 3, `${lang}/tips`);
    assert.ok(copy.operations.every(Boolean), `${lang}/operation-labels`);
    assert.ok(copy.types.every(Boolean), `${lang}/type-labels`);
    assert.ok(copy.subsections.every(Boolean), `${lang}/subsection-labels`);
    assert.ok(copy.tips.every(([title, body]) => title && body), `${lang}/tips-copy`);
    for (const key of ['applySearch', 'mapTitle', 'mapDescription', 'mapMarkerTitle', 'citiesTitle', 'tipsTitle', 'ctaTitle', 'ctaBody', 'ctaButton']) {
      assert.equal(typeof copy[key], 'string', `${lang}/${key}`);
      assert.ok(copy[key].trim().length > 0, `${lang}/${key}`);
    }
  }
});

test('inmuebles landing copy does not expose archived languages as explicit coverage', () => {
  assert.equal(hasInmueblesLandingCopy('he'), false);
  assert.equal(hasInmueblesLandingCopy('yi'), false);
});
