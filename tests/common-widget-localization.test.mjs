import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { RECOMMENDATION_COPY, RECOMMENDATION_LANGUAGES } from '../src/utils/recommendationCopy.js';

const recommendations = fs.readFileSync('src/components/common/RecommendationsWidget.jsx', 'utf8');
const sidebar = fs.readFileSync('src/components/common/SidebarFilters.jsx', 'utf8');
const home = fs.readFileSync('src/components/screens/HomeScreen.jsx', 'utf8');
const detail = fs.readFileSync('src/components/screens/AdDetailScreen.jsx', 'utf8');
const verticalHero = fs.readFileSync('src/components/verticals/VerticalHero.jsx', 'utf8');
const categoryLanding = fs.readFileSync('src/components/screens/verticals/CategoryLanding.jsx', 'utf8');
const catalog = fs.readFileSync('src/components/screens/CatalogScreen.jsx', 'utf8');
const splitView = fs.readFileSync('src/components/common/SplitViewContainer.jsx', 'utf8');

async function translationsFor(lang) {
  return (await import(`../src/constants/translations/${lang}.js`)).default;
}

test('recommendation copy covers exactly the 11 active languages', () => {
  assert.deepEqual(RECOMMENDATION_LANGUAGES, SUPPORTED_LANGUAGES);
  assert.equal(RECOMMENDATION_LANGUAGES.includes('he'), false);
  assert.equal(RECOMMENDATION_LANGUAGES.includes('yi'), false);
  const keys = Object.keys(RECOMMENDATION_COPY.es).sort();
  for (const lang of SUPPORTED_LANGUAGES) {
    const copy = RECOMMENDATION_COPY[lang];
    assert.deepEqual(Object.keys(copy).sort(), keys, `${lang}.shape`);
    for (const [key, value] of Object.entries(copy)) assert.ok(value.trim(), `${lang}.${key}`);
    if (lang !== 'es') assert.notEqual(copy.personalized, RECOMMENDATION_COPY.es.personalized, `${lang}.personalized`);
  }
});

test('Mexico Spanish recommendation copy follows closing-only punctuation', () => {
  const serialized = JSON.stringify(RECOMMENDATION_COPY.es);
  assert.equal(serialized.includes(String.fromCharCode(0xbf)), false);
  assert.equal(serialized.includes(String.fromCharCode(0xa1)), false);
});

test('recommendations use active locale for copy, title and currency', () => {
  assert.equal(recommendations.includes("from 'react-i18next'"), false);
  assert.equal(recommendations.includes("Intl.NumberFormat('es-MX'"), false);
  assert.equal(recommendations.includes('Recomendaciones personalizadas basadas en tus intereses'), false);
  assert.equal(recommendations.includes('Los anuncios más populares en tu zona'), false);
  assert.match(recommendations, /getRecommendationCopy\(lang\)/);
  assert.match(recommendations, /localeFor\(lang\)/);
  assert.match(recommendations, /localizedText\(ad\.title, lang\)/);
  assert.match(home, /<RecommendationsWidget[\s\S]*?lang=\{lang\}[\s\S]*?t=\{t\}[\s\S]*?\/>/);
  assert.match(detail, /<RecommendationsWidget[\s\S]*?lang=\{lang\}[\s\S]*?t=\{t\}[\s\S]*?\/>/);
});

test('SidebarFilters uses guaranteed active-language keys without Spanish fallback literals', async () => {
  const keys = ['filter', 'clear_filters', 'location', 'state_label', 'all_mexico', 'city_label', 'all_cities', 'select_state_first', 'price_mxn', 'min', 'max', 'condition', 'any', 'cond_new', 'cond_used', 'cond_refurb', 'cond_parts'];
  for (const lang of SUPPORTED_LANGUAGES) {
    const t = await translationsFor(lang);
    for (const key of keys) assert.ok(String(t[key] || '').trim(), `${lang}.${key}`);
  }
  for (const literal of ['Todas las ciudades', 'Selecciona un estado', 'Todo México', 'Ubicación', 'Condición', 'Cualquiera']) {
    assert.equal(sidebar.includes(literal), false, literal);
  }
  assert.match(sidebar, /const tr = \(key\) => t\?\.\[key\] \|\| ''/);
});

test('recommendation request and click-tracking contracts stay unchanged', () => {
  assert.match(recommendations, /userId\s*\? `\/api\/recommendations\?\$\{params\}`\s*:\s*`\/api\/recommendations\/trending\?\$\{params\}`/s);
  assert.match(recommendations, /fetch\(`\/api\/ads\/\$\{ad\.id\}\/view`, \{[\s\S]*?method: 'POST'/);
});


test('active catalog and vertical map controls have complete locale keys and no Spanish fallbacks', async () => {
  const keys = ['all_mexico', 'all_city', 'city', 'search_btn', 'search_map', 'view_map', 'radius', 'map', 'near_you', 'map_help', 'apply_filters', 'open_map', 'hide_map', 'save_search', 'search_area_applied'];
  for (const lang of SUPPORTED_LANGUAGES) {
    const t = await translationsFor(lang);
    for (const key of keys) assert.ok(String(t[key] || '').trim(), `${lang}.${key}`);
  }
  for (const [source, literals] of [
    [verticalHero, ['Todo México', 'Toda la ciudad', 'Ver anuncios en mapa', 'Mapa activo', 'Anuncios cerca de', 'Aplicar búsqueda', 'Abrir mapa', "label: 'Aquí'", "'Buscar…'"]],
    [splitView, ["title = 'Todo México'", "'Abrir mapa'", "'Ocultar mapa'"]],
    [catalog, ["'Guardar búsqueda'", "'Todo México'", "'Búsqueda por área aplicada'"]],
  ]) {
    for (const literal of literals) assert.equal(source.includes(literal), false, literal);
  }
  for (const key of ['mapAds', 'radius', 'mapActive', 'nearby', 'mapHelp', 'apply', 'openMap']) {
    assert.match(categoryLanding, new RegExp(`${key}: t\\.`), `CategoryLanding ${key}`);
  }
});
