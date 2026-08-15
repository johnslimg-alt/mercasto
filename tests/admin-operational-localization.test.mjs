import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { ADMIN_OPERATIONAL_COPY, ADMIN_OPERATIONAL_LANGUAGES } from '../src/utils/adminOperationalCopy.js';

const seoSource = fs.readFileSync('src/components/admin/AdminSeoMeasurement.jsx', 'utf8');
const marketingSource = fs.readFileSync('src/components/admin/AdvertisingHub.jsx', 'utf8');
const adminScreen = fs.readFileSync('src/components/screens/AdminScreen.jsx', 'utf8');

function leafStrings(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(leafStrings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(leafStrings);
  return [];
}

test('operational admin copy covers exactly the 11 active languages', () => {
  assert.deepEqual(ADMIN_OPERATIONAL_LANGUAGES, SUPPORTED_LANGUAGES);
  assert.equal(ADMIN_OPERATIONAL_LANGUAGES.includes('he'), false);
  assert.equal(ADMIN_OPERATIONAL_LANGUAGES.includes('yi'), false);
  const shape = JSON.stringify(Object.keys(ADMIN_OPERATIONAL_COPY.es.seo).sort()) + JSON.stringify(Object.keys(ADMIN_OPERATIONAL_COPY.es.marketing).sort());
  for (const lang of SUPPORTED_LANGUAGES) {
    const copy = ADMIN_OPERATIONAL_COPY[lang];
    assert.ok(copy?.seo && copy?.marketing, lang);
    assert.equal(JSON.stringify(Object.keys(copy.seo).sort()) + JSON.stringify(Object.keys(copy.marketing).sort()), shape, `${lang}.shape`);
    assert.equal(Object.keys(copy.marketing.sections).length, 10, `${lang}.sections`);
    assert.equal(copy.marketing.platformDetails.length, 6, `${lang}.platformDetails`);
    for (const text of leafStrings(copy)) assert.ok(text.trim(), `${lang}.empty copy`);
  }
});

test('non-Spanish operational admin copy is localized', () => {
  const es = ADMIN_OPERATIONAL_COPY.es;
  for (const lang of SUPPORTED_LANGUAGES.filter(code => code !== 'es')) {
    const copy = ADMIN_OPERATIONAL_COPY[lang];
    for (const [scope, key] of [['seo', 'loadError'], ['seo', 'nationalReached'], ['marketing', 'headerDesc'], ['marketing', 'campaignsDesc']]) {
      assert.notEqual(copy[scope][key], es[scope][key], `${lang}.${scope}.${key}`);
    }
    assert.notEqual(copy.marketing.sections.dashboard.description, es.marketing.sections.dashboard.description, `${lang}.dashboard`);
  }
});

test('Mexico Spanish operational copy follows closing-only punctuation', () => {
  const serialized = JSON.stringify(ADMIN_OPERATIONAL_COPY.es);
  assert.equal(serialized.includes(String.fromCharCode(0xbf)), false);
  assert.equal(serialized.includes(String.fromCharCode(0xa1)), false);
});

test('SEO/GEO admin uses active locale for text, numbers and dates', () => {
  assert.match(adminScreen, /<AdminSeoMeasurement token=\{token\} lang=\{lang\} t=\{t\} \/>/);
  assert.match(seoSource, /getAdminOperationalCopy\(lang\)\.seo/);
  assert.match(seoSource, /formatNumber\(value, lang\)/);
  assert.match(seoSource, /formatDateTime\(latest\.generated_at, lang/);
  assert.match(seoSource, /formatDate\(snapshot\.period_start, lang\)/);
  assert.match(seoSource, /copy\.internalChats/);
  assert.match(seoSource, /copy\.sellerResponseRate/);
  assert.match(seoSource, /copy\.medianFirstResponse/);
  assert.equal(seoSource.includes("toLocaleString('es-MX')"), false);
  for (const literal of ['No se pudo cargar el reporte SEO/GEO.', 'Aún no hay snapshots semanales.', 'Privacidad verificada', 'Umbral nacional alcanzado', 'Historial de snapshots']) {
    assert.equal(seoSource.includes(literal), false, literal);
  }
  assert.match(seoSource, /fetch\(`\$\{API_URL\}\/admin\/seo-measurement\?limit=12`, \{/);
});

test('Advertising Hub localizes active UI and locale formatting', () => {
  assert.match(marketingSource, /getAdminOperationalCopy\(lang\)\.marketing/);
  assert.match(marketingSource, /localeFor\(lang\)/);
  assert.match(marketingSource, /formatNumber\(value, lang\)/);
  assert.match(marketingSource, /formatDate\(period\.since, lang\)/);
  assert.match(marketingSource, /formatNumber\(campaign\.metrics\?\.ctr \|\| 0, lang/);
  assert.match(marketingSource, /lang === 'es'.*payload\?\.message/s);
  assert.equal(marketingSource.includes("Intl.NumberFormat('es-MX'"), false);
  for (const literal of ['No hay una sesión administrativa activa.', 'No se pudo comprobar Meta Ads.', 'Confirmas ${action}', 'Presupuesto actualizado a', 'No hay campañas disponibles o Meta todavía no está configurado.', 'Resultados y control de campañas.']) {
    assert.equal(marketingSource.includes(literal), false, literal);
  }
});

test('Advertising Hub request methods and mutation payloads stay unchanged', () => {
  assert.match(marketingSource, /fetch\(`\$\{API_URL\}\/admin\/marketing\/meta\/status`, \{ headers \}\)/);
  assert.match(marketingSource, /fetch\(`\$\{API_URL\}\/admin\/marketing\/meta\/campaigns\?days=7&limit=50`, \{ headers \}\)/);
  assert.match(marketingSource, /fetch\(`\$\{API_URL\}\/admin\/marketing\/meta\/campaigns\/\$\{campaignId\}\/\$\{endpoint\}`, \{[\s\S]*?method: 'PATCH',[\s\S]*?body: JSON\.stringify\(payload\)/);
  assert.match(marketingSource, /mutateCampaign\(campaign\.id, 'status', \{ status: nextStatus \}/);
  assert.match(marketingSource, /mutateCampaign\(campaign\.id, 'budget', \{ daily_budget: value \}/);
  assert.match(marketingSource, /const nextStatus = currentStatus === 'ACTIVE' \? 'PAUSED' : 'ACTIVE'/);
});
