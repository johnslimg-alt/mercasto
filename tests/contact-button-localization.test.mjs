import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const source = fs.readFileSync('src/components/common/ContactButton.jsx', 'utf8');
const REQUIRED_KEYS = [
  'ct_contact_btn', 'close_btn', 'ct_seller_fallback', 'verified',
  'ct_safety_title', 'ct_safety_text', 'ct_restricted_title',
  'ct_restricted_text', 'login_register', 'ct_whatsapp_sub', 'ct_footer_note',
];

async function translationsFor(lang) {
  return (await import(`../src/constants/translations/${lang}.js`)).default;
}

test('active contact button copy covers exactly the 11 active languages', async () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 11);
  assert.equal(SUPPORTED_LANGUAGES.includes('he'), false);
  assert.equal(SUPPORTED_LANGUAGES.includes('yi'), false);
  for (const lang of SUPPORTED_LANGUAGES) {
    const t = await translationsFor(lang);
    for (const key of REQUIRED_KEYS) {
      assert.ok(String(t[key] || '').trim(), `${lang}.${key}`);
    }
  }
});

test('Mexico Spanish contact copy follows closing-only punctuation policy', async () => {
  const t = await translationsFor('es');
  const serialized = JSON.stringify(Object.fromEntries(REQUIRED_KEYS.map(key => [key, t[key]])));
  assert.equal(serialized.includes(String.fromCharCode(0xbf)), false);
  assert.equal(serialized.includes(String.fromCharCode(0xa1)), false);
});

test('active contact button has no public fallback literals and localizes listing title', () => {
  for (const literal of [
    "t.ct_contact_btn || 'Contactar'",
    "t.close_btn || t.close || 'Close'",
    "t.ct_seller_fallback || 'Vendedor'",
    "t.verified || 'Verificado'",
    "t.ct_safety_title || 'Seguridad:'",
    'No pagues anticipos sin verificar el producto o vendedor.',
    "t.ct_restricted_title || 'Acceso Restringido'",
    'Regístrate para ver los contactos del vendedor.',
    "t.login_register || 'Iniciar sesión / Registrarse'",
    "t.ct_whatsapp_sub || 'Responder rápida'",
    'Mercasto no participa en la transacción. Verifica siempre al vendedor.',
  ]) assert.equal(source.includes(literal), false, literal);

  assert.match(source, /localizedText\(ad\?\.title, siteLang\)/);
  for (const key of REQUIRED_KEYS) assert.ok(source.includes(`t.${key}`), key);
});

test('contact channel, analytics and restricted-access contracts stay unchanged', () => {
  assert.match(source, /logContact\('whatsapp'\)/);
  assert.match(source, /logContact\('telegram'\)/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/ads\/\$\{ad\.id\}\/click`,[\s\S]*?method: 'POST'/);
  assert.match(source, /body: JSON\.stringify\(\{ channel, ad_id: ad\.id \}\)/);
  assert.match(source, /window\.open\(whatsappUrl, '_blank', 'noopener,noreferrer'\)/);
  assert.match(source, /window\.open\(telegramUrl, '_blank', 'noopener,noreferrer'\)/);
  assert.match(source, /window\.location\.href = '\/profile'/);
  assert.match(source, /digits\.length === 10 \? `52\$\{digits\}` : digits/);
});
