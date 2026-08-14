import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { STORE_DIRECTORY_CATEGORIES, getStoresDirectoryCategories, getStoresDirectoryCopy, hasStoresDirectoryCopyLanguage } from '../src/utils/storesDirectoryCopy.js';
import { getPublicSeo } from '../src/constants/publicSeo.js';

const source = fs.readFileSync(new URL('../src/components/screens/StoresScreen.jsx', import.meta.url), 'utf8');
const required = [
  'seoTitle', 'seoDescription', 'directory', 'title', 'subtitle', 'search', 'active', 'total', 'empty', 'view',
  'trust', 'proTitle', 'proDescription', 'activatePro', 'viewPlans', 'mexico', 'defaultDescription', 'bannerAlt', 'logoAlt',
];

test('stores directory copy explicitly covers every active language', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    assert.equal(hasStoresDirectoryCopyLanguage(lang), true, `${lang} explicit coverage`);
    const copy = getStoresDirectoryCopy(lang);
    assert.deepEqual(getPublicSeo('/tiendas', lang), { title: copy.seoTitle, description: copy.seoDescription }, `${lang} public SEO`);
    for (const key of required) assert.ok(String(copy[key] || '').trim(), `${lang}.${key}`);
    assert.equal(Object.keys(copy.categories).length, STORE_DIRECTORY_CATEGORIES.length, `${lang} category count`);
  }
  assert.equal(hasStoresDirectoryCopyLanguage('he'), false);
  assert.equal(hasStoresDirectoryCopyLanguage('yi'), false);
});

test('translated store category labels preserve canonical backend query values', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    const categories = getStoresDirectoryCategories(lang);
    assert.deepEqual(categories.map(item => item.query), STORE_DIRECTORY_CATEGORIES.map(item => item.query), `${lang} canonical queries`);
    assert.ok(categories.every(item => String(item.label || '').trim()), `${lang} labels`);
  }
  assert.match(source, /value=\{cat\.query\}>\{cat\.label\}<\/option>/);
  assert.match(source, /setSelectedCategory\(cat\.query\)/);
  assert.match(source, /category=\$\{encodeURIComponent\(selectedCategory\)\}/);
});

test('stores screen replaces Spanish-only metadata and card fallbacks with localized copy', () => {
  assert.match(source, /business_address \|\| copy\.mexico/);
  assert.match(source, /business_description \|\| copy\.defaultDescription/);
  for (const oldCopy of [
    'Directorio de Tiendas Oficiales y Negocios PRO | Mercasto México',
    'Automotriz', 'Bienes Raíces', 'Servicios Profesionales',
    "business_address || 'México'",
    'Tienda oficial con un catálogo de productos de alta calidad y atención profesional.',
  ]) assert.equal(source.includes(oldCopy), false, `screen must not hardcode: ${oldCopy}`);
});
