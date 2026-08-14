import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SUPPORTED_LANGUAGES, getTranslations, loadLanguage } from '../src/utils/translations.js';

const source = fs.readFileSync(new URL('../src/components/screens/StorefrontScreen.jsx', import.meta.url), 'utf8');
const requiredKeys = [
  'closed_hours', 'check_hours', 'seller_role', 'banner_upload_failed', 'cover_photo', 'change_banner',
  'rfc_verified', 'all_mexico', 'reviews_count', 'business_profile_tag', 'website', 'review_placeholder',
];

test('storefront public-copy dependencies exist in every active language', async () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    await loadLanguage(lang);
    const t = getTranslations(lang);
    for (const key of requiredKeys) assert.ok(String(t[key] || '').trim(), `${lang}.${key}`);
  }
});

test('storefront screen does not fall back to Spanish-only public copy', () => {
  for (const oldCopy of [
    "t.closed_hours || 'Cerrado'",
    "t.check_hours || 'Consultar horario'",
    "t.seller_role || 'Vendedor'",
    'Error al subir la portada',
    'Error de red al subir la portada',
    'Actualizar Portada',
    'RFC verificado',
    "business_address || 'México'",
    "t.reviews_count || 'reseñas'",
    'Perfil de negocio',
    'Sitio web',
    'Cómo fue tu experiencia con este vendedor?',
  ]) {
    assert.equal(source.includes(oldCopy), false, `screen must not contain: ${oldCopy}`);
  }
  assert.match(source, /alert\(t\.banner_upload_failed\)/);
  assert.match(source, /alt=\{t\.cover_photo\}/);
  assert.match(source, /business_address \|\| t\.all_mexico/);
  assert.match(source, /placeholder=\{t\.review_placeholder\}/);
});
