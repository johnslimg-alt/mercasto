import test from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { getServiciosLandingCopy, hasServiciosLandingCopy } from '../src/utils/serviciosLandingCopy.js';

test('servicios landing copy covers every active language', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    assert.equal(hasServiciosLandingCopy(lang), true, lang);
    const copy = getServiciosLandingCopy(lang);
    assert.equal(copy.categories.length, 11, `${lang}/categories`);
    assert.equal(copy.trust.length, 3, `${lang}/trust`);
    assert.ok(copy.categories.every(Boolean), `${lang}/category-labels`);
    assert.ok(copy.trust.every(([title, body]) => title && body), `${lang}/trust-copy`);
    for (const key of ['mapTitle', 'mapDescription', 'mapMarkerTitle', 'needsTitle', 'trustTitle', 'ctaTitle', 'ctaBody', 'ctaButton']) {
      assert.equal(typeof copy[key], 'string', `${lang}/${key}`);
      assert.ok(copy[key].trim().length > 0, `${lang}/${key}`);
    }
  }
});

test('servicios landing copy does not expose archived languages as explicit coverage', () => {
  assert.equal(hasServiciosLandingCopy('he'), false);
  assert.equal(hasServiciosLandingCopy('yi'), false);
});
