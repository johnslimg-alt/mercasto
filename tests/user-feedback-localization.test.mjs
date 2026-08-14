import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const REQUIRED_KEYS = ['coupon_redeem_success', 'coupon_redeem_error'];

async function translationsFor(lang) {
  return (await import(`../src/constants/translations/${lang}.js`)).default;
}

test('coupon feedback covers exactly the 11 active languages', async () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 11);
  assert.equal(SUPPORTED_LANGUAGES.includes('he'), false);
  assert.equal(SUPPORTED_LANGUAGES.includes('yi'), false);
  for (const lang of SUPPORTED_LANGUAGES) {
    const t = await translationsFor(lang);
    for (const key of REQUIRED_KEYS) assert.ok(String(t[key] || '').trim(), `${lang}.${key}`);
  }
});

test('non-Spanish coupon feedback does not reuse Spanish copy', async () => {
  const spanish = await translationsFor('es');
  for (const lang of SUPPORTED_LANGUAGES.filter(language => language !== 'es')) {
    const t = await translationsFor(lang);
    for (const key of REQUIRED_KEYS) assert.notEqual(t[key], spanish[key], `${lang}.${key}`);
  }
});

test('Mexico Spanish coupon feedback follows closing-only punctuation policy', async () => {
  const t = await translationsFor('es');
  const serialized = JSON.stringify(Object.fromEntries(REQUIRED_KEYS.map(key => [key, t[key]])));
  assert.equal(serialized.includes(String.fromCharCode(0xbf)), false);
  assert.equal(serialized.includes(String.fromCharCode(0xa1)), false);
});

test('remaining user feedback uses active-language copy', () => {
  const app = fs.readFileSync('src/App.jsx', 'utf8');
  const home = fs.readFileSync('src/components/screens/HomeScreen.jsx', 'utf8');
  assert.match(home, /savingSearchAlert \? `\$\{t\.saving_word\}\.\.\.`/);
  assert.equal(home.includes("savingSearchAlert ? 'Guardando...'"), false);
  assert.match(app, /console\.error\("Review error", err\); showToast\(t\.connection_error, 'error'\)/);
  assert.match(app, /localizeServerMessage\(lang, data\.message, t\.coupon_redeem_success\)/);
  assert.match(app, /localizeServerMessage\(lang, data\.message, t\.coupon_redeem_error\)/);
});

test('coupon redeem request and balance update contract stay unchanged', () => {
  const source = fs.readFileSync('src/App.jsx', 'utf8');
  const start = source.indexOf('const handleRedeemCoupon');
  const end = source.indexOf('// --- ПРОСМОТР ОБЪЯВЛЕНИЯ И АНАЛИТИКА ---', start);
  const block = source.slice(start, end);
  assert.match(block, /fetch\(`\$\{API_URL\}\/user\/coupons\/redeem`,[\s\S]*?method: 'POST'/);
  assert.match(block, /body: JSON\.stringify\(\{ code: couponInput\.trim\(\) \}\)/);
  assert.match(block, /if \(res\.ok && data\.balance !== undefined\)/);
  assert.match(block, /const updatedUser = \{ \.\.\.user, balance: data\.balance \}/);
  assert.match(block, /localStorage\.setItem\('user', JSON\.stringify\(updatedUser\)\)/);
  assert.match(block, /showToast\(t\.connection_error, 'error'\)/);
});
