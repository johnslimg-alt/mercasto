import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { categoryLandingTranslations } from '../src/constants/categoryLandingTranslations.js';
import { VERTICAL_SEO_ROUTES, getVerticalSeo } from '../src/constants/verticalSeo.js';
import { getVerticalCopy } from '../src/utils/verticalCopy.js';

const source = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const categoryRoutes = {
  '/ocio': 'ocio', '/boletos': 'boletos', '/moda': 'moda', '/hogar': 'hogar',
  '/electronica': 'electronica', '/infantil': 'infantil', '/mascotas': 'mascotas', '/negocios': 'negocios',
};
const customRoutes = {
  '/autos': 'motor', '/motor': 'motor', '/empleos': 'empleos', '/servicios': 'servicios',
  '/inmuebles': 'inmuebles', '/productos': 'productos', '/turismo': 'turismo',
};

test('category landing runtime SEO follows the active language', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    for (const [route, key] of Object.entries(categoryRoutes)) {
      const seo = getVerticalSeo(route, lang);
      assert.ok(seo?.title && seo?.description, `${lang} ${route}`);
      if (lang === 'es') assert.deepEqual(seo, VERTICAL_SEO_ROUTES[route]);
      else {
        const expected = categoryLandingTranslations[lang][key];
        assert.equal(seo.title, expected.seoTitle, `${lang} ${route} title`);
        assert.equal(seo.description, expected.seoDesc, `${lang} ${route} description`);
      }
    }
  }
});

test('custom vertical runtime SEO covers /autos and follows the active language', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    for (const [route, key] of Object.entries(customRoutes)) {
      const seo = getVerticalSeo(route, lang);
      assert.ok(seo?.title && seo?.description, `${lang} ${route}`);
      if (lang === 'es' && (VERTICAL_SEO_ROUTES[route] || route === '/autos')) {
        const established = VERTICAL_SEO_ROUTES[route] || VERTICAL_SEO_ROUTES['/motor'];
        assert.deepEqual(seo, established);
      } else {
        const expected = getVerticalCopy(lang, key);
        assert.equal(seo.title, `${expected.title} | Mercasto`, `${lang} ${route} title`);
        assert.equal(seo.description, expected.subtitle, `${lang} ${route} description`);
      }
    }
  }
});

test('App runtime SEO does not inject Spanish-only dynamic suffixes into other languages', () => {
  assert.match(source, /getVerticalSeo\(location\.pathname, lang\)/);
  assert.match(source, /title = `\$\{localizedText\(viewedAd\.title, lang\)\} \| Mercasto`/);
  assert.match(source, /title = `\$\{viewedCompany\.name\} \| Mercasto`/);
  assert.match(source, /title = `Mercasto \| \$\{t\.ai_brand_short/);
  assert.match(source, /title = `\$\{catName\} \| Mercasto`/);
  for (const oldCopy of [
    'Catálogo Mercasto', 'Anuncio no disponible', 'Tienda Oficial',
    'Anuncios clasificados con IA en México', 'en México | Anuncios Clasificados Mercasto',
    'Mira sus anuncios clasificados activos',
  ]) assert.equal(source.includes(oldCopy), false, `runtime SEO must not hardcode: ${oldCopy}`);
});


test('result cards keep catalog disclosure and common controls localized', () => {
  const card = fs.readFileSync('src/components/common/AdCard.jsx', 'utf8');
  assert.match(card, /detailCopy\.catalogTitle/);
  assert.match(card, /detailCopy\.publishSimilar/);
  assert.match(card, /t\.ct_contact_btn/);
  assert.match(card, /t\.all_mexico/);
  for (const spanish of ['Catálogo Mercasto', 'Precio de referencia', 'Quitar de favoritos', 'Agregar a favoritos', 'Vende uno similar', 'Resaltado']) {
    assert.equal(card.includes(spanish), false, spanish);
  }
});


test('ad detail social metadata agrees with App runtime SEO description', () => {
  const detail = fs.readFileSync(new URL('../src/components/screens/AdDetailScreen.jsx', import.meta.url), 'utf8');
  assert(detail.includes("localizedText(ad.description, lang).substring(0, 160)"));
  assert(!detail.includes("`$${formatNumber(ad.price || 0, lang)} - ${ad.state || ad.location || detailCopy.mexico}`"));
});
