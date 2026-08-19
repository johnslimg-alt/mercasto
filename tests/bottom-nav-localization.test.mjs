import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const source = fs.readFileSync('src/components/ui/BottomNav.jsx', 'utf8');
const REQUIRED_KEYS = ['global_menu', 'home', 'search', 'post_ad', 'favorites', 'profile'];

async function translationsFor(lang) {
  return (await import(`../src/constants/translations/${lang}.js`)).default;
}

test('bottom navigation copy covers exactly the 11 active languages', async () => {
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

test('bottom navigation uses product localization without English default values', () => {
  assert.equal(source.includes('useTranslation'), false);
  assert.equal(source.includes('defaultValue:'), false);
  assert.equal(source.includes('aria-label="Mobile navigation"'), false);
  assert.match(source, /const \{ lang, loadedLangVersion \} = useUI\(\)/);
  assert.match(source, /const t = getTranslations\(lang\)/);
  for (const key of REQUIRED_KEYS) assert.ok(source.includes(`t.${key}`), key);
});

test('search focus no longer depends on Spanish or English placeholder text', () => {
  assert.equal(source.includes('placeholder*="Buscar"'), false);
  assert.equal(source.includes('placeholder*="Search"'), false);
  assert.match(source, /data-testid=\\"mobile-search-input\\"/);
  assert.match(source, /data-testid=\\"desktop-search-input\\"/);
  assert.match(source, /getClientRects\(\)\.length > 0/);
  assert.match(source, /searchInput\.focus\(\)/);
});

test('bottom navigation routing and auth gates remain unchanged', () => {
  assert.match(source, /case 'home':[\s\S]*?navigate\('\/'\)/);
  assert.match(source, /case 'post':[\s\S]*?if \(user\)[\s\S]*?navigate\('\/post'\)/);
  assert.match(source, /case 'favorites':[\s\S]*?setDashboardTab\('favorites'\)[\s\S]*?navigate\('\/profile'\)/);
  assert.match(source, /case 'profile':[\s\S]*?navigate\('\/profile'\)/);
  assert.match(source, /setAuthMode\('login'\)/);
  assert.match(source, /setShowAuthModal\(true\)/);
});
