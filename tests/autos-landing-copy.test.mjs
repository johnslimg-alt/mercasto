import test from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { getAutosLandingCopy, hasAutosLandingCopy } from '../src/utils/autosLandingCopy.js';

test('autos landing copy covers every active language', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    assert.equal(hasAutosLandingCopy(lang), true, lang);
    const copy = getAutosLandingCopy(lang);
    assert.equal(copy.subsections.length, 7, `${lang}/subsections`);
    assert.ok(copy.subsections.every(Boolean), `${lang}/subsection-labels`);
    assert.ok(copy.conditions.nuevo, `${lang}/condition/nuevo`);
    assert.ok(copy.conditions.usado, `${lang}/condition/usado`);
    assert.equal(copy.stats.length, 4, `${lang}/stats`);
    assert.ok(copy.stats.every(([value, label]) => value && label), `${lang}/stats-copy`);
    for (const key of ['applyFilters', 'mapTitle', 'mapDescription', 'mapMarkerTitle', 'brandsTitle', 'sellTitle', 'sellBody', 'sellButton']) {
      assert.equal(typeof copy[key], 'string', `${lang}/${key}`);
      assert.ok(copy[key].trim().length > 0, `${lang}/${key}`);
    }
  }
});

test('autos landing copy does not expose archived languages as explicit coverage', () => {
  assert.equal(hasAutosLandingCopy('he'), false);
  assert.equal(hasAutosLandingCopy('yi'), false);
});
