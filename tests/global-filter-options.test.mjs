import test from 'node:test';
import assert from 'node:assert/strict';
import { getGlobalFilterDefinitions, SUPPORTED_GLOBAL_FILTER_IDS } from '../src/constants/globalFilterOptions.js';

const languages = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja'];
const translations = {};
for (const language of languages) {
  translations[language] = (await import(`../src/constants/translations/${language}.js`)).default;
}

const valuesByFilter = (language) => Object.fromEntries(
  getGlobalFilterDefinitions(translations[language]).map((filter) => [
    filter.id,
    filter.options.map((option) => option.value),
  ]),
);

test('global filter ids match the supported backend surface', () => {
  assert.deepEqual(getGlobalFilterDefinitions(translations.es).map((filter) => filter.id), SUPPORTED_GLOBAL_FILTER_IDS);
  assert.equal(SUPPORTED_GLOBAL_FILTER_IDS.includes('radius_km'), false);
});

test('filter values stay canonical across every supported language', () => {
  const canonical = valuesByFilter('es');
  for (const language of languages) {
    assert.deepEqual(valuesByFilter(language), canonical, `filter values changed in ${language}`);
  }
});
