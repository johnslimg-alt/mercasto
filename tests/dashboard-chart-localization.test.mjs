import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  DASHBOARD_CHART_COPY,
  getDashboardChartCopy,
} from '../src/constants/dashboardChartCopy.js';

const source = fs.readFileSync('src/components/screens/dashboard/DashboardCharts.jsx', 'utf8');
const ACTIVE_LANGUAGES = ['ar', 'de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'ru', 'zh'];

test('dashboard chart singular copy covers exactly the 11 active languages', () => {
  assert.deepEqual(Object.keys(DASHBOARD_CHART_COPY).sort(), ACTIVE_LANGUAGES);
  for (const language of ACTIVE_LANGUAGES) {
    assert.equal(typeof DASHBOARD_CHART_COPY[language].ad_singular, 'string');
    assert.ok(DASHBOARD_CHART_COPY[language].ad_singular.trim(), language);
  }
  assert.equal(getDashboardChartCopy('es-MX').ad_singular, 'anuncio');
  assert.equal(getDashboardChartCopy('unsupported').ad_singular, 'anuncio');
});

test('seller dashboard charts follow the live product translation table', () => {
  assert.match(source, /useUI\(\)/);
  assert.match(source, /loadedLangVersion/);
  assert.match(source, /getTranslations\(lang\)/);
  for (const key of ['views', 'contacts_qr', 'categories', 'clicks', 'no_results_found', 'ads']) {
    assert.ok(source.includes(`t.${key}`), key);
  }
  assert.match(source, /chartCopy\.ad_singular/);

  for (const legacy of [
    '> Vistas<',
    '> Contactos (QR)<',
    '> Categorías<',
    'No hay datos...',
    'unit="vistas"',
    'unit="clicks"',
    "'anuncio'",
    "'anuncios'",
  ]) assert.equal(source.includes(legacy), false, legacy);

  assert.match(source, /dataKey="views"/);
  assert.match(source, /dataKey="clicks"/);
});
