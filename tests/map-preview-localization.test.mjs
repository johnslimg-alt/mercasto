import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const source = fs.readFileSync('src/components/common/MercastoMapPreview.jsx', 'utf8');
const adsMap = fs.readFileSync('src/components/common/AdsMap.jsx', 'utf8');
const requiredKeys = [
  'common.loading', 'common.search', 'common.close', 'filters.maxPrice',
  'map.allMexico', 'map.approxCity', 'map.approxState', 'map.approxCityState', 'map.realGps', 'map.listing',
  'map.listings', 'map.viewListing', 'map.label', 'map.preview',
  'map.fullscreen', 'map.interactive', 'map.searchArea', 'map.closeMap',
  'map.closeEsc', 'map.clearFilters',
];
const staleSpanish = [
  'Cargando mapa', 'Todo México', 'Anuncio', 'Ver anuncio', 'Mapa interactivo',
  'Vista previa', 'Ampliar', 'Buscar en el mapa', 'Precio máx.', 'GPS real',
  'Buscar en zona', 'Cerrar mapa', 'Limpiar filtros', 'Approx ciudad/estado',
];

const get = (object, key) => key.split('.').reduce((value, part) => value?.[part], object);

test('active map preview routes visible copy through i18n', () => {
  assert.match(source, /useTranslation\(\)/);
  assert.match(source, /localizedText\(ad\.title, lang\)/);
  assert.match(source, /toLocaleString\(localeFor\(lang\)/);
  assert.equal(source.includes("toLocaleString('es-MX'"), false);
  const activeMapSources = `${source}
${adsMap}`;
  for (const key of requiredKeys) assert.ok(activeMapSources.includes(`'${key}'`), key);
  for (const literal of staleSpanish) assert.equal(source.includes(literal), false, literal);
  for (const literal of ['Cargando anuncios', 'Todo México', 'GPS real', 'Approx ciudad', 'Approx estado', "toLocaleString('es-MX'", "'Ver'"]) {
    assert.equal(adsMap.includes(literal), false, `AdsMap: ${literal}`);
  }
  assert.match(adsMap, /toLocaleString\(localeFor\(lang\)/);
  assert.ok(adsMap.includes("'map.approxCity'"));
  assert.ok(adsMap.includes("'map.approxState'"));
});
test('active map preview keys exist in all 11 runtime locales', () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 11);
  assert.equal(SUPPORTED_LANGUAGES.includes('he'), false);
  assert.equal(SUPPORTED_LANGUAGES.includes('yi'), false);
  for (const lang of SUPPORTED_LANGUAGES) {
    const locale = JSON.parse(fs.readFileSync(`src/locales/${lang}.json`, 'utf8'));
    for (const key of requiredKeys) {
      assert.ok(String(get(locale, key) || '').trim(), `${lang}.${key}`);
    }
  }
});

test('Mexico Spanish map copy keeps closing-only punctuation', () => {
  const locale = JSON.parse(fs.readFileSync('src/locales/es.json', 'utf8'));
  const serialized = requiredKeys.map(key => String(get(locale, key) || '')).join('\n');
  assert.equal(serialized.includes(String.fromCodePoint(0xbf)), false);
  assert.equal(serialized.includes(String.fromCodePoint(0xa1)), false);
});
