export const LOCALE_BY_LANG = {
  es: 'es-MX',
  en: 'en-US',
  pt: 'pt-BR',
  fr: 'fr-FR',
  zh: 'zh-CN',
  ko: 'ko-KR',
  de: 'de-DE',
  it: 'it-IT',
  ar: 'ar-MX',
  he: 'he-IL',
  yi: 'yi',
  ru: 'ru-RU',
  ja: 'ja-JP',
};

export function localeFor(lang) {
  return LOCALE_BY_LANG[lang] || LOCALE_BY_LANG.es;
}

export function formatMXN(value, lang, options = {}) {
  return new Intl.NumberFormat(localeFor(lang), {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(Number(value || 0));
}

export function formatDateTime(value, lang, options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(localeFor(lang), options);
}
