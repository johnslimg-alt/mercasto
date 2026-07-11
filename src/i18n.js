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

// Paid traffic to the seller landing must always start in Spanish, regardless
// of a previously saved language or the browser/device language.
if (forceSpanishCampaignLanding) {
  try {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
  } catch {}

  if (typeof document !== 'undefined') {
    document.documentElement.lang = 'es';
    document.documentElement.dir = 'ltr';
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    ...(forceSpanishCampaignLanding ? { lng: 'es' } : {}),
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
  const cleanLang = String(lang || '').toLowerCase().split('-')[0];
  await loadI18nLanguage(cleanLang);
  return originalChangeLanguage(lang, callback);
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
