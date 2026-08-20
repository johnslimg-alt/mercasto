import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { listingPolicyReviewTranslations } from '../src/constants/listingPolicyReviewTranslations.js';

const ACTIVE_LANGUAGES = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja'];

test('every active language explains policy holds as human review before publication', () => {
  assert.deepEqual(Object.keys(listingPolicyReviewTranslations).sort(), [...ACTIVE_LANGUAGES].sort());

  for (const lang of ACTIVE_LANGUAGES) {
    const copy = listingPolicyReviewTranslations[lang];
    assert.equal(typeof copy?.listing_quality_policy_manual_review, 'string', lang);
    assert.ok(copy.listing_quality_policy_manual_review.length > 20, lang);
    assert.equal(typeof copy?.listing_quality_continue_hint, 'string', lang);
    assert.ok(copy.listing_quality_continue_hint.length > 20, lang);
  }

  assert.match(
    listingPolicyReviewTranslations.es.listing_quality_policy_manual_review,
    /revisión humana|revisión manual/i,
  );
  assert.match(
    listingPolicyReviewTranslations.en.listing_quality_policy_manual_review,
    /human review|manual review/i,
  );
});

test('runtime translation loader overlays the policy-review copy on every language bundle', async () => {
  const source = await readFile(new URL('../src/utils/translations.js', import.meta.url), 'utf8');
  assert.match(source, /getListingPolicyReviewTranslations/);
  assert.match(source, /mergeListingQualityValidationTranslations/);
  assert.match(source, /mergeRuntimeListingTranslations\('es', esTranslations\)/);
  assert.match(source, /mergeRuntimeListingTranslations\(lang, module\.default\)/);
});
