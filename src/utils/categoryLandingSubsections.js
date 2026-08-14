import { subcategoriesByLang } from '../constants/subcategoryTranslations.js';
import { normalizeLanguage } from './translations.js';

export function getCategoryLandingSubsections(language, category, canonicalSubcategories = []) {
  const lang = normalizeLanguage(language);
  const translated = subcategoriesByLang[lang]?.[category] || [];

  return canonicalSubcategories.map((query, index) => ({
    query,
    name: translated[index] || query,
  }));
}
