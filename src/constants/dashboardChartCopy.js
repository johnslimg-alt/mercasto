export const DASHBOARD_CHART_COPY = Object.freeze({
  es: { ad_singular: 'anuncio' },
  en: { ad_singular: 'ad' },
  pt: { ad_singular: 'anúncio' },
  fr: { ad_singular: 'annonce' },
  zh: { ad_singular: '广告' },
  ko: { ad_singular: '광고' },
  de: { ad_singular: 'Anzeige' },
  it: { ad_singular: 'annuncio' },
  ar: { ad_singular: 'إعلان' },
  ru: { ad_singular: 'объявление' },
  ja: { ad_singular: '広告' },
});

export function getDashboardChartCopy(language = 'es') {
  const lang = String(language || '').toLowerCase().split('-')[0];
  return DASHBOARD_CHART_COPY[lang] || DASHBOARD_CHART_COPY.es;
}
