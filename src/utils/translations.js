import { translations } from '../constants/mockData';

export const SUPPORTED_LANGUAGES = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'he', 'yi', 'ru', 'ja'];
export const RTL_LANGUAGES = new Set(['ar', 'he', 'yi']);

export function normalizeLanguage(language = 'es') {
  const code = String(language).toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(code) ? code : 'es';
}

export function getTranslations(language = 'es') {
  const lang = normalizeLanguage(language);
  return {
    ...(translations.es || {}),
    ...(lang === 'es' ? {} : translations.en || {}),
    ...(translations[lang] || {}),
  };
}

export function applyDocumentLanguage(language = 'es') {
  const lang = normalizeLanguage(language);
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr';
}
