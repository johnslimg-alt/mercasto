import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { mergeListingQualityValidationTranslations } from '../src/constants/listingQualityValidationTranslations.js';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const CODES = ['title_too_short','title_missing_letters','description_too_short','description_missing_letters','price_negative','incomplete_preview_payload','price_zero','contact_data_in_copy','keyword_stuffing','title_repeated_as_description','photo_recommended','duplicate_listing_risk'];
const UI_KEYS = ['warning_title','blocked_title','continue','continue_hint','generic'];

async function translationsFor(lang) {
  const base = (await import(`../src/constants/translations/${lang}.js`)).default;
  return mergeListingQualityValidationTranslations(lang, base);
}

test('listing quality guidance covers all 11 active languages', async () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 11);
  for (const lang of SUPPORTED_LANGUAGES) {
    const t = await translationsFor(lang);
    for (const key of [...UI_KEYS, ...CODES]) {
      assert.ok(String(t[`listing_quality_${key}`] || '').trim(), `${lang}.listing_quality_${key}`);
    }
  }
});

test('seller create and edit UI consume backend machine codes without duplicating quality rules', () => {
  const app = fs.readFileSync('src/App.jsx', 'utf8');
  const postScreen = fs.readFileSync('src/components/screens/PostScreen.jsx', 'utf8');
  const editScreen = fs.readFileSync('src/components/screens/EditAdScreen.jsx', 'utf8');
  assert.match(app, /'X-Mercasto-Quality-Preflight': 'preview'/);
  assert.match(app, /previewData\.quality_preflight/);
  assert.match(postScreen, /t\[`listing_quality_\$\{code\}`\]/);
  assert.match(postScreen, /hasQualityWarnings \? t\.listing_quality_continue/);
  assert.match(editScreen, /data\?\.quality_preflight\?\.errors/);
  assert.match(editScreen, /t\[`listing_quality_\$\{code\}`\]/);
  assert.match(app, /data\.rejected_rows\.slice\(0, 3\)/);
  assert.match(app, /t\[`listing_quality_\$\{code\}`\]/);
  for (const implementationRule of ['keyword_stuffing', 'contact_data_in_copy', 'title_repeated_as_description']) {
    assert.equal(postScreen.includes(`code === '${implementationRule}'`), false);
  }
});

test('Mexico Spanish quality guidance keeps closing-only punctuation', async () => {
  const t = await translationsFor('es');
  const copy = [...UI_KEYS, ...CODES].map(key => t[`listing_quality_${key}`]).join(' ');
  const invertedQuestionMark = String.fromCodePoint(0x00bf);
  const invertedExclamationMark = String.fromCodePoint(0x00a1);
  assert.equal(copy.includes(invertedQuestionMark), false);
  assert.equal(copy.includes(invertedExclamationMark), false);
});
