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

export function formatNumber(value, lang, options = {}) {
  return new Intl.NumberFormat(localeFor(lang), options).format(Number(value || 0));
}

export function formatDate(value, lang, options = {}) {
  if (!value) return '';
  const raw = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00`
    : value;
  const date = value instanceof Date ? value : new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(localeFor(lang), options);
}
