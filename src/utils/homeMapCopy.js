export const HOME_MAP_LANGUAGES = Object.freeze(['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja']);

const COPY = Object.freeze({
  es: { loading: 'Cargando mapa de propiedades...', propertiesAll: 'Propiedades en todo México', propertiesIn: 'Propiedades en {state}' },
  en: { loading: 'Loading property map...', propertiesAll: 'Properties across Mexico', propertiesIn: 'Properties in {state}' },
  pt: { loading: 'Carregando mapa de imóveis...', propertiesAll: 'Imóveis em todo o México', propertiesIn: 'Imóveis em {state}' },
  fr: { loading: 'Chargement de la carte des biens...', propertiesAll: 'Biens immobiliers dans tout le Mexique', propertiesIn: 'Biens immobiliers à {state}' },
  zh: { loading: '正在加载房产地图...', propertiesAll: '全墨西哥房产', propertiesIn: '{state} 的房产' },
  ko: { loading: '부동산 지도를 불러오는 중...', propertiesAll: '멕시코 전역의 부동산', propertiesIn: '{state}의 부동산' },
  de: { loading: 'Immobilienkarte wird geladen...', propertiesAll: 'Immobilien in ganz Mexiko', propertiesIn: 'Immobilien in {state}' },
  it: { loading: 'Caricamento mappa immobili...', propertiesAll: 'Immobili in tutto il Messico', propertiesIn: 'Immobili in {state}' },
  ar: { loading: 'جارٍ تحميل خريطة العقارات...', propertiesAll: 'عقارات في جميع أنحاء المكسيك', propertiesIn: 'عقارات في {state}' },
  ru: { loading: 'Загружаем карту недвижимости...', propertiesAll: 'Недвижимость по всей Мексике', propertiesIn: 'Недвижимость в {state}' },
  ja: { loading: '不動産マップを読み込み中...', propertiesAll: 'メキシコ全土の不動産', propertiesIn: '{state}の不動産' },
});

export function getHomeMapCopy(language = 'es') {
  const lang = String(language || 'es').toLowerCase().split('-')[0];
  return COPY[lang] || COPY.es;
}

export function formatHomePropertiesLabel(language, state) {
  const copy = getHomeMapCopy(language);
  return state ? copy.propertiesIn.replace('{state}', state) : copy.propertiesAll;
}

export { COPY as HOME_MAP_COPY };
