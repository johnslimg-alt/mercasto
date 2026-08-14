import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { formatSellerProfileCopy, getSellerProfileCopy, hasSellerProfileCopyLanguage, sellerReviewLabel } from '../src/utils/sellerProfileCopy.js';

const source = fs.readFileSync(new URL('../src/components/screens/SellerProfileScreen.jsx', import.meta.url), 'utf8');
const required = [
  'sellerNotFound', 'loadError', 'back', 'phoneVerified', 'emailVerified', 'verified', 'editProfile',
  'memberSince', 'reviewOne', 'reviewMany', 'about', 'contact', 'activeAds', 'reviews', 'noActiveAds', 'priceOnRequest',
];

test('seller profile copy explicitly covers every active language', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    assert.equal(hasSellerProfileCopyLanguage(lang), true, `${lang} explicit coverage`);
    const copy = getSellerProfileCopy(lang);
    for (const key of required) assert.ok(String(copy[key] || '').trim(), `${lang}.${key}`);
    assert.ok(!formatSellerProfileCopy(copy.memberSince, { year: 2026 }).includes('{'));
    assert.equal(sellerReviewLabel(lang, 1), copy.reviewOne);
    assert.equal(sellerReviewLabel(lang, 2), copy.reviewMany);
  }
  assert.equal(hasSellerProfileCopyLanguage('he'), false);
  assert.equal(hasSellerProfileCopyLanguage('yi'), false);
});

test('seller profile screen uses locale-aware display contracts and resets request errors', () => {
  assert.match(source, /normalizeLanguage\(i18n\.resolvedLanguage \|\| i18n\.language\)/);
  assert.match(source, /formatNumber\(ad\.price, lang\)/);
  assert.match(source, /localizedText\(ad\.title, lang\)/);
  assert.match(source, /setError\(null\)/);
  for (const spanishOnly of [
    'Este vendedor no existe.',
    'Error al cargar el perfil.',
    'Teléfono verificado',
    'Editar perfil',
    'Miembro desde',
    'Sobre mí',
    'Anuncios activos',
    'Este vendedor no tiene anuncios activos.',
    'Precio a tratar',
  ]) {
    assert.equal(source.includes(spanishOnly), false, `screen must not hardcode: ${spanishOnly}`);
  }
});
