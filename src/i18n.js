import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import es from './locales/es.json';

const normalizePathname = (pathname = '') => {
  const trimmed = String(pathname).replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}` : '/';
};

const SPANISH_CAMPAIGN_PATHS = new Set(['/vendedores', '/publicar-gratis']);
const forceSpanishCampaignLanding =
  typeof window !== 'undefined' &&
  SPANISH_CAMPAIGN_PATHS.has(normalizePathname(window.location.pathname));

const DISABLED_LANGUAGES = new Set(['he', 'yi']); // intentionally disabled and archived
const SUPPORTED_LANGUAGES = new Set(['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja']);
const savedProductLanguage = (() => {
  if (typeof window === 'undefined') return 'es';
  try {
    const saved = localStorage.getItem('lang') || localStorage.getItem('mercasto_language');
    const normalized = String(saved || '').toLowerCase().split('-')[0];
    return SUPPORTED_LANGUAGES.has(normalized) ? normalized : 'es';
  } catch {
    return 'es';
  }
})();
const initialLanguage = forceSpanishCampaignLanding ? 'es' : savedProductLanguage;

// Paid traffic to the seller landing must always start in Spanish, regardless
// of a previously saved language or the browser/device language.
if (forceSpanishCampaignLanding) {
  try {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
  } catch {}

  if (typeof document !== 'undefined') {
    document.documentElement.lang = 'es-MX';
    document.documentElement.dir = 'ltr';
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: initialLanguage,
    resources: {
      es: { translation: es }
    },
    fallbackLng: (code) => {
      const language = String(code || '').split('-')[0];
      return language === 'es' ? ['es'] : ['en', 'es'];
    },
    returnEmptyString: false,
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'mercasto_language'
    }
  });

// Dynamic resource loader for other languages to avoid bloating the main bundle
export async function loadI18nLanguage(lang) {
  const cleanLang = String(lang || '').toLowerCase().split('-')[0];
  if (DISABLED_LANGUAGES.has(cleanLang) || !SUPPORTED_LANGUAGES.has(cleanLang)) return;
  if (cleanLang === 'es' || i18n.hasResourceBundle(cleanLang, 'translation')) {
    return;
  }
  try {
    const res = await import(`./locales/${cleanLang}.json`);
    i18n.addResourceBundle(cleanLang, 'translation', res.default || res);
  } catch (e) {
    console.error(`Failed to load i18n JSON for ${cleanLang}`, e);
  }
}

// Hook into changeLanguage to load dynamic JSON bundles automatically
const originalChangeLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = async (lang, callback) => {
  const requested = String(lang || '').toLowerCase().split('-')[0];
  const cleanLang = SUPPORTED_LANGUAGES.has(requested) ? requested : 'es';
  await loadI18nLanguage(cleanLang);
  return originalChangeLanguage(cleanLang, callback);
};

// Initial load check for detected language
const detected = i18n.language || 'es';
const detectedBase = detected.split('-')[0];
if (detectedBase !== 'es') {
  loadI18nLanguage(detectedBase).then(() => {
    i18n.changeLanguage(detected);
  });
}

export default i18n;
