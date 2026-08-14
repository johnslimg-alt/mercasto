import test from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { getEmpleosLandingCopy, hasEmpleosLandingCopy } from '../src/utils/empleosLandingCopy.js';

test('empleos landing copy covers every active language', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    assert.equal(hasEmpleosLandingCopy(lang), true, lang);
    const copy = getEmpleosLandingCopy(lang);
    assert.equal(copy.areas.length, 8, `${lang}/areas`);
    assert.equal(copy.modalities.length, 3, `${lang}/modalities`);
    assert.equal(copy.subsections.length, 9, `${lang}/subsections`);
    assert.equal(copy.stats.length, 4, `${lang}/stats`);
    assert.ok(copy.areas.every(Boolean), `${lang}/area-labels`);
    assert.ok(copy.modalities.every(Boolean), `${lang}/modality-labels`);
    assert.ok(copy.subsections.every(Boolean), `${lang}/subsection-labels`);
    assert.ok(copy.stats.every(([value, label]) => value && label), `${lang}/stats-copy`);
    for (const key of ['applyJobs', 'mapTitle', 'mapDescription', 'mapMarkerTitle', 'areasTitle', 'employerTitle', 'employerBody', 'employerButton']) {
      assert.equal(typeof copy[key], 'string', `${lang}/${key}`);
      assert.ok(copy[key].trim().length > 0, `${lang}/${key}`);
    }
  }
});

test('empleos landing copy does not expose archived languages as explicit coverage', () => {
  assert.equal(hasEmpleosLandingCopy('he'), false);
  assert.equal(hasEmpleosLandingCopy('yi'), false);
});
