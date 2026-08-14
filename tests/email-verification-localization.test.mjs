import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const languages = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja'];
const requiredKeys = [
  'invalidLink', 'success', 'expired', 'checking', 'verified',
  'badge', 'failed', 'retry', 'home',
];

function locale(lang) {
  return JSON.parse(fs.readFileSync(new URL(`../src/locales/${lang}.json`, import.meta.url), 'utf8'));
}

test('email verification copy explicitly covers every active language', () => {
  for (const lang of languages) {
    const copy = locale(lang).verification;
    assert.ok(copy, `${lang} verification block missing`);
    for (const key of requiredKeys) {
      assert.equal(typeof copy[key], 'string', `${lang}.${key} must be a string`);
      assert.ok(copy[key].trim(), `${lang}.${key} must not be empty`);
    }
  }
});

test('verification UI does not expose backend Spanish messages directly', () => {
  const source = fs.readFileSync(new URL('../src/components/screens/VerificarEmailScreen.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /data\.message\s*\|\|/);
  assert.doesNotMatch(source, /data\.error\s*\|\|/);
  assert.match(source, /localT\('verification\.success'\)/);
  assert.match(source, /localT\('verification\.expired'\)/);
  assert.match(source, /t\('verification\.home'\)/);
  assert.match(source, /loadI18nLanguage\(language\)/);
});

test('Mexico Spanish verification copy follows punctuation policy', () => {
  const copy = locale('es').verification;
  for (const value of Object.values(copy)) {
    assert.equal(value.includes(String.fromCodePoint(0xBF)), false);
    assert.equal(value.includes(String.fromCodePoint(0xA1)), false);
  }
});
