import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import es from './locales/es.json';
import en from './locales/en.json';
import pt from './locales/pt.json';
import fr from './locales/fr.json';
import zh from './locales/zh.json';
import ko from './locales/ko.json';
import de from './locales/de.json';
import it from './locales/it.json';
import ar from './locales/ar.json';
import he from './locales/he.json';
import yi from './locales/yi.json';
import ru from './locales/ru.json';
import ja from './locales/ja.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
      pt: { translation: pt },
      fr: { translation: fr },
      zh: { translation: zh },
      ko: { translation: ko },
      de: { translation: de },
      it: { translation: it },
      ar: { translation: ar },
      he: { translation: he },
      yi: { translation: yi },
      ru: { translation: ru },
      ja: { translation: ja }
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

export default i18n;
