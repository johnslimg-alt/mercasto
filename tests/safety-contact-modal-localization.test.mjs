import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const REQUIRED_KEYS = [
  'qr_contact_title', 'qr_contact_desc', 'report_ad_help', 'report_select_reason',
  'report_reason_fraud', 'report_reason_inappropriate', 'report_reason_counterfeit',
  'report_reason_other', 'report_details_placeholder', 'report_send', 'report_user_help',
  'report_reason_abusive', 'report_reason_suspected_fraud',
  'report_reason_prohibited_products', 'report_reason_impersonation',
  'report_additional_details', 'report_user_details_placeholder',
];

async function translationsFor(lang) {
  return (await import(`../src/constants/translations/${lang}.js`)).default;
}

test('safety and contact modal copy covers exactly the 11 active languages', async () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 11);
  assert.equal(SUPPORTED_LANGUAGES.includes('he'), false);
  assert.equal(SUPPORTED_LANGUAGES.includes('yi'), false);
  for (const lang of SUPPORTED_LANGUAGES) {
    const t = await translationsFor(lang);
    for (const key of REQUIRED_KEYS) assert.ok(String(t[key] || '').trim(), `${lang}.${key}`);
  }
});

test('non-Spanish safety modal copy is not the Spanish source text', async () => {
  const es = await translationsFor('es');
  for (const lang of SUPPORTED_LANGUAGES.filter(code => code !== 'es')) {
    const t = await translationsFor(lang);
    for (const key of ['qr_contact_title', 'report_ad_help', 'report_send', 'report_user_help']) {
      assert.notEqual(t[key], es[key], `${lang}.${key}`);
    }
  }
});

test('Mexico Spanish safety copy follows closing-only punctuation policy', async () => {
  const t = await translationsFor('es');
  const serialized = JSON.stringify(Object.fromEntries(REQUIRED_KEYS.map(key => [key, t[key]])));
  assert.equal(serialized.includes(String.fromCharCode(0xbf)), false);
  assert.equal(serialized.includes(String.fromCharCode(0xa1)), false);
});

test('App renders QR and report modal UI from active-language copy', () => {
  const source = fs.readFileSync('src/App.jsx', 'utf8');
  for (const token of [
    't.qr_contact_title', 't.qr_contact_desc', 't.report_ad_help', 't.report_select_reason',
    't.report_reason_fraud', 't.report_reason_inappropriate', 't.report_reason_counterfeit',
    't.report_reason_abusive', 't.report_reason_suspected_fraud',
    't.report_reason_prohibited_products', 't.report_reason_impersonation',
    't.report_additional_details', 't.report_send',
  ]) assert.ok(source.includes(token), token);

  for (const formerLiteral of [
    '>Escanea para contactar</h2>',
    '>Ayúdanos a entender el problema con este anuncio.</p>',
    '>Reportar Vendedor</h2>',
    '>Ayúdanos a mantener una comunidad segura.</p>',
    '>Comentarios adicionales</label>',
    '>Detalles adicionales</label>',
    'placeholder="Proporciona más detalles..."',
    'placeholder="Explica la situación..."',
    '>Enviar Reporte</button>',
  ]) assert.equal(source.includes(formerLiteral), false, formerLiteral);
});

test('report reason codes and request payload contracts stay unchanged', () => {
  const source = fs.readFileSync('src/App.jsx', 'utf8');
  for (const value of [
    'Fraude o estafa', 'Contenido inapropiado', 'Artículo falso o falsificado',
    'Ya se vendió', 'Otro', 'Comportamiento abusivo', 'Sospecha de fraude',
    'Vende productos ilegales', 'Suplantación de identidad',
  ]) assert.ok(source.includes(`value="${value}"`), value);

  assert.match(source, /fetch\(`\$\{API_URL\}\/ads\/\$\{reportingAd\.id\}\/report`,[\s\S]*?method: 'POST',[\s\S]*?body: JSON\.stringify\(reportForm\)/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/users\/\$\{viewedCompany\.id\}\/report`,[\s\S]*?method: 'POST',[\s\S]*?body: JSON\.stringify\(userReportForm\)/);
});
