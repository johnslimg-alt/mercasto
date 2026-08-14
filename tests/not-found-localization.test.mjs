import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const languages = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja'];
const keys = ['home', 'motor', 'realEstate', 'jobs', 'services'];

function locale(lang) {
  return JSON.parse(fs.readFileSync(new URL(`../src/locales/${lang}.json`, import.meta.url), 'utf8'));
}

test('404 navigation labels cover every active language', () => {
  for (const lang of languages) {
    const home = locale(lang).home;
    for (const key of keys) {
      assert.equal(typeof home[key], 'string', `${lang}.home.${key} must be a string`);
      assert.ok(home[key].trim(), `${lang}.home.${key} must not be empty`);
    }
  }
});

test('404 screen consumes localized navigation labels', () => {
  const source = fs.readFileSync(new URL('../src/components/screens/NotFoundScreen.jsx', import.meta.url), 'utf8');
  for (const key of keys) assert.match(source, new RegExp(`home\\.${key}`));
  assert.doesNotMatch(source, /🚗 Autos/);
  assert.doesNotMatch(source, /🏠 Inmuebles/);
  assert.doesNotMatch(source, /💼 Empleos/);
  assert.doesNotMatch(source, /🔧 Servicios/);
});

test('404 route owns robots metadata while it is mounted', () => {
  const screen = fs.readFileSync(new URL('../src/components/screens/NotFoundScreen.jsx', import.meta.url), 'utf8');
  const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(screen, /mercastoSeoOwner = 'not-found'/);
  assert.match(screen, /meta\.content = 'noindex, nofollow'/);
  assert.match(app, /routeSeoOwner === 'not-found'/);
  assert.match(app, /routeSeoOwner !== 'not-found'/);
});
