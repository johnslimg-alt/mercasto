import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const routeHelpers = fs.readFileSync('src/app/routeHelpers.jsx', 'utf8');
const header = fs.readFileSync('src/components/shell/AppHeader.jsx', 'utf8');
const footer = fs.readFileSync('src/components/shell/AppFooter.jsx', 'utf8');
const logo = fs.readFileSync('src/components/shell/MercastoLogo.jsx', 'utf8');
const authAndLogoSources = [app, routeHelpers, header, footer, logo].join('\n');
async function translationsFor(lang) {
  return (await import(`../src/constants/translations/${lang}.js`)).default;
}

test('auth and logo brand copy has complete active-language keys', async () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 11);
  for (const lang of SUPPORTED_LANGUAGES) {
    const t = await translationsFor(lang);
    for (const key of ['ai_brand_tagline', 'ai_brand_short', 'footer_desc']) {
      assert.ok(String(t[key] || '').trim(), `${lang}.${key}`);
    }
  }
});

test('auth and logo surfaces do not use Spanish fallback literals', () => {
  assert.equal(authAndLogoSources.includes("tagline || 'La plataforma de clasificados más moderna e inteligente con AI'"), false);
  assert.equal(authAndLogoSources.includes('tagline = "Clasificados con IA"'), false);
  assert.equal(authAndLogoSources.includes("tagline={t.ai_brand_short || 'Clasificados con IA'}"), false);
  assert.equal(authAndLogoSources.includes("t.footer_desc || 'La plataforma de clasificados más moderna e inteligente con AI para México.'"), false);
  assert.match(routeHelpers, /tagline \|\| t\.ai_brand_tagline/);
  assert.match(`${header}\n${footer}`, /tagline=\{t\.ai_brand_short\}/);
});
