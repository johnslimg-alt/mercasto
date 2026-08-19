import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const source = fs.readFileSync('src/hooks/useGeolocation.js', 'utf8');
const requiredKeys = [
  'geolocation.unsupported',
  'geolocation.permissionDenied',
  'geolocation.unavailable',
  'geolocation.timeout',
  'geolocation.unknown',
];
const get = (object, key) => key.split('.').reduce((value, part) => value?.[part], object);

test('geolocation hook routes user-facing errors through i18n', () => {
  assert.match(source, /useTranslation\(\)/);
  for (const key of requiredKeys) assert.ok(source.includes(`'${key}'`), key);
  for (const literal of [
    'Geolocalización no soportada en este navegador',
    'Permiso de ubicación denegado.',
    'Ubicación no disponible. Verifica tu conexión GPS.',
    'Tiempo de espera agotado. Intenta de nuevo.',
    'Error desconocido',
  ]) assert.equal(source.includes(literal), false, literal);
});
test('geolocation copy exists in all 11 active runtime locales', () => {
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

test('Mexico Spanish geolocation copy keeps closing-only punctuation', () => {
  const locale = JSON.parse(fs.readFileSync('src/locales/es.json', 'utf8'));
  const serialized = requiredKeys.map((key) => String(get(locale, key) || '')).join('\n');
  assert.equal(serialized.includes(String.fromCodePoint(0xbf)), false);
  assert.equal(serialized.includes(String.fromCodePoint(0xa1)), false);
});
