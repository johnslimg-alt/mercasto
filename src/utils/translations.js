import esTranslations from '../constants/translations/es.js';

export const SUPPORTED_LANGUAGES = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'he', 'yi', 'ru', 'ja'];
export const RTL_LANGUAGES = new Set(['ar', 'he', 'yi']);

const cache = {
  es: esTranslations,
};

export function normalizeLanguage(language = 'es') {
  const code = String(language).toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(code) ? code : 'es';
}

export function getTranslations(language = 'es') {
  const lang = normalizeLanguage(language);
  return cache[lang] || cache['es'];
}

export async function loadLanguage(language) {
  const lang = normalizeLanguage(language);
  if (cache[lang]) {
    return cache[lang];
  }
  
  try {
    const module = await import(`../constants/translations/${lang}.js`);
    cache[lang] = module.default;
    return cache[lang];
  } catch (error) {
    console.error(`Failed to load translations for language: ${lang}`, error);
    return cache['es'];
  }
}

export function applyDocumentLanguage(language = 'es') {
  const lang = normalizeLanguage(language);
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr';
}
