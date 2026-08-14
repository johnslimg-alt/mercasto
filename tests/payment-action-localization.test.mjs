import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import {
  PAYMENT_ACTION_LANGUAGES,
  formatPaymentActionCopy,
  getPaymentActionCopy,
} from '../src/utils/paymentActionCopy.js';

const languages = SUPPORTED_LANGUAGES;
const requiredKeys = [
  'payWithBalance',
  'balancePaid',
  'selectActiveAd',
  'invalidCreditsAmount',
  'promotionConfirm',
  'promotionSuccess',
  'promotionError',
  'choosePackage',
];

test('payment action copy explicitly covers every active language', () => {
  assert.deepEqual(PAYMENT_ACTION_LANGUAGES, languages);
  assert.equal(PAYMENT_ACTION_LANGUAGES.includes('he'), false);
  assert.equal(PAYMENT_ACTION_LANGUAGES.includes('yi'), false);
  for (const lang of languages) {
    const copy = getPaymentActionCopy(lang);
    for (const key of requiredKeys) {
      assert.equal(typeof copy[key], 'string', `${lang}.${key} must be a string`);
      assert.ok(copy[key].trim(), `${lang}.${key} must not be empty`);
    }
  }
});

test('payment action templates interpolate dynamic values without leaking placeholders', () => {
  for (const lang of languages) {
    const payment = formatPaymentActionCopy(lang, 'payWithBalance', {
      amount: 'MX$99',
      balance: 'MX$500',
    });
    const promotion = formatPaymentActionCopy(lang, 'promotionConfirm', {
      credits: '50',
      type: 'QA promotion',
      balance: '500 credits',
    });
    const invalidAmount = formatPaymentActionCopy(lang, 'invalidCreditsAmount', {
      min: 'MIN_MXN',
      max: 'MAX_MXN',
    });
    assert.match(payment, /MX\$99/);
    assert.match(payment, /MX\$500/);
    assert.match(promotion, /50/);
    assert.match(promotion, /QA promotion/);
    assert.match(invalidAmount, /MIN_MXN/);
    assert.match(invalidAmount, /MAX_MXN/);
    assert.doesNotMatch(`${payment}${promotion}${invalidAmount}`, /\{(?:amount|balance|credits|type|min|max)\}/);
  }
});

test('Mexico Spanish payment copy follows punctuation policy', () => {
  for (const value of Object.values(getPaymentActionCopy('es'))) {
    assert.equal(value.includes(String.fromCodePoint(0xBF)), false);
    assert.equal(value.includes(String.fromCodePoint(0xA1)), false);
  }
});

test('App localizes payment actions without changing backend purchase contracts', () => {
  const source = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /getPaymentActionCopy\(lang\)/);
  assert.match(source, /formatPaymentActionCopy\(lang, 'payWithBalance'/);
  assert.match(source, /formatPaymentActionCopy\(lang, 'promotionConfirm'/);
  assert.match(source, /formatPaymentActionCopy\(lang, 'invalidCreditsAmount'/);
  assert.match(source, /body: JSON\.stringify\(\{ description, ad_id: adId, product_code: productCode \}\)/);
  assert.match(source, /body: JSON\.stringify\(\{ type \}\)/);
  assert.match(source, /`\$\{numericAmount\.toLocaleString\('es-MX'\)\} Créditos Mercasto`/);
  assert.doesNotMatch(source, /showToast\('Pago realizado con tu saldo!'/);
  assert.doesNotMatch(source, /showToast\('Selecciona un anuncio activo para promocionar\.'/);
  assert.doesNotMatch(source, /showToast\('Ingresa un monto entre \$50 y \$5,000\.'/);
  assert.doesNotMatch(source, /showToast\('Anuncio promocionado con éxito!'/);
  assert.doesNotMatch(source, /showToast\('Elige un paquete para promocionar este anuncio\.'/);
});
