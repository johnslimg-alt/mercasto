import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const v2 = fs.readFileSync('src/components/screens/HomeScreenV2.jsx', 'utf8');
const faq = fs.readFileSync('src/components/seo/FAQSchema.jsx', 'utf8');
const css = fs.readFileSync('src/components/screens/HomeScreenV2.css', 'utf8');

test('Home V2 emits the ItemList structured data for the rendered ads', () => {
  assert.match(v2, /import ItemListSchema from '\.\.\/seo\/ItemListSchema'/, 'ItemListSchema not imported');
  assert.match(v2, /<ItemListSchema\b/, 'ItemListSchema is imported but never rendered');
  assert.match(v2, /items=\{safeAds\}/, 'ItemListSchema must receive the rendered ads');
  assert.match(v2, /safeAds\.length > 0 &&/, 'ItemListSchema must not run on an empty list');
  assert.match(v2, /lang=\{lang\}/, 'ItemListSchema must receive the active language');
});

test('Home V2 emits the FAQPage structured data', () => {
  assert.match(v2, /import FAQSchema from '\.\.\/seo\/FAQSchema'/, 'FAQSchema not imported');
  assert.match(v2, /<FAQSchema pageType="home" lang=\{lang\} variant="v2" \/>/, 'FAQSchema not rendered for the home page');
  assert.match(faq, /script\.id = 'faq-schema'/, 'FAQPage JSON-LD must still be emitted');
  assert.match(faq, /'@type': 'FAQPage'/, 'FAQPage type missing');
});

test('the V2 FAQ keeps the shared copy but not the Tailwind card', () => {
  // One source of FAQ copy and schema for both screens...
  assert.match(faq, /getHomeFaqCopy\(currentLang\)/, 'V2 FAQ must reuse the shared home FAQ copy');
  // ...but the V2 homepage runs its own class-based design system, so the
  // Tailwind card must stay on the default variant only.
  const v2Branch = faq.slice(faq.indexOf("variant === 'v2'"), faq.indexOf('<div className="mt-8 rounded-xl'));
  assert.ok(v2Branch.length > 0, 'v2 variant branch not found');
  assert.match(v2Branch, /className="v2-faq"/, 'v2 variant must use V2 classes');
  assert.doesNotMatch(v2Branch, /dark:bg-gray-800|bg-white/, 'v2 variant must not host Tailwind surface classes');
  assert.match(css, /\.v2-faq\{/, 'v2 FAQ styles missing');
  assert.match(css, /\.dark \.v2-faq-item summary span/, 'v2 FAQ needs a dark-mode rule');
});
