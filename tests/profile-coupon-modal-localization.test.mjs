import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const coupon = fs.readFileSync('src/components/modals/CouponModal.jsx', 'utf8');
const profile = fs.readFileSync('src/components/modals/ProfileModal.jsx', 'utf8');

const REQUIRED_KEYS = [
  'close_btn', 'redeem_coupon_title', 'redeem_coupon_desc',
  'coupon_code_placeholder', 'redeem', 'edit_profile_title',
  'change_photo', 'name_label', 'save_changes',
];

async function translationsFor(lang) {
  return (await import(`../src/constants/translations/${lang}.js`)).default;
}

test('profile and coupon modal keys cover exactly the 11 active languages', async () => {
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

test('coupon modal uses guaranteed localized copy without literal fallbacks', () => {
  for (const literal of ['Canjear Cupón', 'Introduce tu código promocional', 'CÓDIGO', "|| 'Canjear'", "|| 'Close'"]) {
    assert.equal(coupon.includes(literal), false, literal);
  }
  for (const key of ['close_btn', 'redeem_coupon_title', 'redeem_coupon_desc', 'coupon_code_placeholder', 'redeem']) {
    assert.ok(coupon.includes(`t.${key}`), key);
  }
});

test('profile modal uses guaranteed localized copy and treats avatar preview as decorative', () => {
  for (const literal of ['Editar Perfil', 'Cambiar Foto', "|| 'Nombre'", 'Guardar Cambios', 'alt="Avatar"', "|| 'Close'"]) {
    assert.equal(profile.includes(literal), false, literal);
  }
  assert.match(profile, /alt=""/);
  for (const key of ['close_btn', 'edit_profile_title', 'change_photo', 'name_label', 'save_changes']) {
    assert.ok(profile.includes(`t.${key}`), key);
  }
});

test('coupon redemption and profile upload contracts remain unchanged', () => {
  assert.match(coupon, /onSubmit=\{handleRedeemCoupon\}/);
  assert.match(coupon, /setCouponInput\(e\.target\.value\.toUpperCase\(\)\)/);
  assert.match(profile, /onSubmit=\{handleProfileSubmit\}/);
  assert.match(profile, /accept="image\/\*"/);
  assert.match(profile, /URL\.createObjectURL\(file\)/);
});
