import test from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { subcategoriesMap } from '../src/constants/locationsAndCategories.js';
import { subcategoriesByLang } from '../src/constants/subcategoryTranslations.js';
import { getCategoryLandingSubsections } from '../src/utils/categoryLandingSubsections.js';

const categories = ['electronica', 'moda', 'hogar', 'tecnologia', 'telefonos', 'mascotas', 'infantil', 'negocios', 'ocio', 'boletos'];

test('category landing subcategory labels cover all active languages without changing canonical queries', () => {
  const canonicalTotal = categories.reduce((sum, category) => sum + (subcategoriesMap[category] || []).length, 0);
  assert.equal(canonicalTotal, 75);

  for (const lang of SUPPORTED_LANGUAGES) {
    for (const category of categories) {
      const canonical = subcategoriesMap[category] || [];
      assert.deepEqual(subcategoriesByLang.es?.[category] || [], canonical, `${category} Spanish order matches canonical taxonomy`);
      const items = getCategoryLandingSubsections(lang, category, canonical);
      assert.equal(items.length, canonical.length, `${lang}/${category} length`);
      items.forEach((item, index) => {
        assert.equal(item.query, canonical[index], `${lang}/${category}/${index} canonical query`);
        assert.equal(item.name, subcategoriesByLang[lang]?.[category]?.[index] || canonical[index], `${lang}/${category}/${index} label`);
      });
    }
  }
});
