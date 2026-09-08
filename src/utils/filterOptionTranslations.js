export const FILTER_OPTION_LANGUAGES = ['en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja'];

const cache = {};
const loaders = {
  en: () => import('../constants/filterOptionTranslations/en.js'),
  pt: () => import('../constants/filterOptionTranslations/pt.js'),
  fr: () => import('../constants/filterOptionTranslations/fr.js'),
  zh: () => import('../constants/filterOptionTranslations/zh.js'),
  ko: () => import('../constants/filterOptionTranslations/ko.js'),
  de: () => import('../constants/filterOptionTranslations/de.js'),
  it: () => import('../constants/filterOptionTranslations/it.js'),
  ar: () => import('../constants/filterOptionTranslations/ar.js'),
  ru: () => import('../constants/filterOptionTranslations/ru.js'),
  ja: () => import('../constants/filterOptionTranslations/ja.js'),
};

const normalize = (language) => String(language || 'es').toLowerCase().split('-')[0];

export async function loadFilterOptionLanguage(language) {
  const lang = normalize(language);
  if (lang === 'es' || cache[lang]) return cache[lang] || null;
  const loader = loaders[lang];
  if (!loader) return null;
  const module = await loader();
  cache[lang] = module.default || module;
  return cache[lang];
}

export function filterOptionValue(option) {
  if (typeof option === 'string' || typeof option === 'number') return String(option);
  return String(option?.value ?? option?.label ?? '');
}


export function canonicalizeFilterOptionSelection(options, selection) {
  if (!Array.isArray(options) || selection == null) return selection;
  const canonicalizeOne = (item) => {
    if (typeof item !== 'string' && typeof item !== 'number') return item;
    const candidate = String(item).trim().toLocaleLowerCase();
    for (const option of options) {
      const canonical = filterOptionValue(option);
      if (!canonical) continue;
      if (canonical.trim().toLocaleLowerCase() === candidate) return canonical;
      if (option && typeof option === 'object' && typeof option.label === 'string'
        && option.label.trim().toLocaleLowerCase() === candidate) return canonical;
    }
    return item;
  };
  return Array.isArray(selection) ? selection.map(canonicalizeOne) : canonicalizeOne(selection);
}

export function filterOptionLabel(fieldId, canonicalValue, language = 'es') {
  const value = String(canonicalValue ?? '');
  if (!value) return value;
  const lang = normalize(language);
  if (lang === 'es') return value;
  return cache[lang]?.[fieldId]?.[value] || value;
}

export function filterOptionDisplayLabel(fieldId, option, language = 'es') {
  const value = filterOptionValue(option);
  if (!value) return value;
  const translated = filterOptionLabel(fieldId, value, language);
  if (translated !== value) return translated;
  if (option && typeof option === 'object' && typeof option.label === 'string' && option.label.trim()) return option.label.trim();
  return value;
}
