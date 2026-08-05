import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  VERTICAL_CANONICAL_ALIASES,
  VERTICAL_SEO_ROUTES,
} from '../src/constants/verticalSeo.js';

const expectedRoutes = [
  '/ocio', '/boletos', '/empleos', '/moda', '/hogar', '/electronica',
  '/servicios', '/motor', '/inmuebles', '/infantil', '/mascotas',
  '/negocios', '/productos', '/turismo',
];

assert.deepEqual(Object.keys(VERTICAL_SEO_ROUTES).sort(), expectedRoutes.sort(), 'vertical SEO route set changed');

const titles = new Set();
const descriptions = new Set();
for (const [route, meta] of Object.entries(VERTICAL_SEO_ROUTES)) {
  assert(route.startsWith('/'), `${route}: route must be absolute`);
  assert(meta.name?.trim(), `${route}: name is required`);
  assert(meta.title?.includes('Mercasto'), `${route}: branded title is required`);
  assert(meta.title.length >= 35 && meta.title.length <= 70, `${route}: title length must stay search-friendly`);
  assert(meta.description.length >= 90 && meta.description.length <= 180, `${route}: description length must stay useful`);
  assert(!titles.has(meta.title), `${route}: duplicate title`);
  assert(!descriptions.has(meta.description), `${route}: duplicate description`);
  titles.add(meta.title);
  descriptions.add(meta.description);
}

for (const [alias, canonical] of Object.entries(VERTICAL_CANONICAL_ALIASES)) {
  assert(!VERTICAL_SEO_ROUTES[alias], `${alias}: alias cannot also be an indexable vertical`);
  assert(VERTICAL_SEO_ROUTES[canonical], `${alias}: canonical target ${canonical} is not indexable`);
}

const app = fs.readFileSync('src/App.jsx', 'utf8');
assert(app.includes('"@type": "CollectionPage"'), 'vertical CollectionPage schema is required');
assert(app.includes('"@type": "BreadcrumbList"'), 'vertical BreadcrumbList schema is required');
assert(app.includes('getVerticalCanonicalAlias(location.pathname)'), 'vertical aliases must be canonicalized');

const categoryLanding = fs.readFileSync('src/components/screens/verticals/CategoryLanding.jsx', 'utf8');
assert(!categoryLanding.includes('<h1'), 'CategoryLanding must not duplicate the VerticalHero H1');

const guardedFiles = [
  'src/components/screens/verticals/AutosLanding.jsx',
  'src/components/screens/verticals/EmpleosLanding.jsx',
  'src/components/screens/verticals/ServiciosLanding.jsx',
  'src/components/screens/verticals/CategoryLanding.jsx',
  'src/constants/categoryLandingTranslations.js',
  'src/utils/verticalCopy.js',
];
const guardedText = guardedFiles.map(path => fs.readFileSync(path, 'utf8')).join('\n');
const forbiddenClaims = [
  '45,000+', '1,200+', '12,000+', '3,500+',
  'Vendedores verificados', 'Profesionales verificados', 'Criadores verificados',
  'Empresas verificadas', 'IMEI verificado', 'Seguridad garantizada',
  'Con reseñas reales',
];
for (const claim of forbiddenClaims) {
  assert(!guardedText.includes(claim), `unsupported vertical claim returned: ${claim}`);
}

const products = fs.readFileSync('src/components/screens/verticals/ProductosLanding.jsx', 'utf8');
assert(!products.includes('category="productos"'), 'products hub must not query a nonexistent umbrella inventory category');
assert(products.includes("navigate('/listings?category=formacion')"), 'training tile needs a valid filtered-results destination');

const tourism = fs.readFileSync('src/components/screens/verticals/TurismoLanding.jsx', 'utf8');
assert(tourism.includes("new URLSearchParams({ category: 'turismo', search: query })"), 'tourism tiles must use filtered results');
assert(tourism.includes('/ads?category=turismo&per_page=6'), 'tourism featured inventory must use the VerticalAdGrid API contract');

console.log(`Vertical SEO contract OK: ${expectedRoutes.length} indexable routes, ${Object.keys(VERTICAL_CANONICAL_ALIASES).length} aliases.`);
