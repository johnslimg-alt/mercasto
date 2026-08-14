import assert from 'node:assert/strict';
import fs from 'node:fs';
import { VERTICAL_CANONICAL_ALIASES, VERTICAL_SEO_ROUTES } from '../src/constants/verticalSeo.js';
import { PUBLIC_SEO_ROUTES } from '../src/constants/publicSeo.js';

const phpVertical = fs.readFileSync('backend/config/vertical_seo.php', 'utf8');
const phpPublic = fs.readFileSync('backend/config/public_seo.php', 'utf8');
const controller = fs.readFileSync('backend/app/Http/Controllers/SeoShellController.php', 'utf8');
const routes = fs.readFileSync('backend/routes/web.php', 'utf8');
const nginx = fs.readFileSync('default.conf', 'utf8');
const sitemap = fs.readFileSync('backend/app/Http/Controllers/Api/SitemapController.php', 'utf8');
const app = fs.readFileSync('src/App.jsx', 'utf8');

const shellLocation = nginx.match(/# Sitemap-listed verticals\/public pages[\s\S]*?location ~ \^\/\(([^)]+)\)\/\?\$ \{/);
assert(shellLocation, 'sitemap/public nginx shell location is missing');
const nginxPaths = new Set(shellLocation[1].split('|'));

assert(controller.includes('public function vertical('));
assert(controller.includes('public function verticalAlias('));
assert(controller.includes('public function publicPage('));
assert(routes.includes("config('vertical_seo.pages'"));
assert(routes.includes("config('vertical_seo.aliases'"));
assert(routes.includes("config('vertical_seo.redirects'"));
assert(routes.includes("config('public_seo.pages'"));
for (const [route, meta] of Object.entries(VERTICAL_SEO_ROUTES)) {
  const slug = route.slice(1);
  assert(nginxPaths.has(slug), `${route}: nginx must route the initial shell through Laravel`);
  for (const value of [slug, meta.name, meta.title, meta.description]) {
    assert(phpVertical.includes(value), `${route}: PHP vertical metadata drifted from React`);
  }
}

for (const [alias, canonical] of Object.entries(VERTICAL_CANONICAL_ALIASES)) {
  const slug = alias.slice(1);
  assert(nginxPaths.has(slug), `${alias}: alias initial shell must reach Laravel`);
  assert(phpVertical.includes(`'${slug}' => '${canonical.slice(1)}'`), `${alias}: PHP alias mapping drifted`);
}

for (const redirect of ['autos', 'informatica', 'telefonia']) {
  assert(nginxPaths.has(redirect), `/${redirect}: redirect must reach Laravel before SPA fallback`);
  assert(phpVertical.includes(`'${redirect}' =>`), `/${redirect}: server redirect is missing`);
}

for (const [route, meta] of Object.entries(PUBLIC_SEO_ROUTES)) {
  const slug = route.slice(1);
  assert(nginxPaths.has(slug), `${route}: public sitemap shell must reach Laravel`);
  for (const value of [slug, meta.title, meta.description]) {
    assert(phpPublic.includes(value), `${route}: PHP public metadata drifted from React`);
  }
}
assert(app.includes("import { getPublicSeo } from './constants/publicSeo';"));
assert(app.includes('const publicSeo = getPublicSeo(location.pathname, lang);'));
assert(app.includes('} else if (publicSeo) {'));

assert(sitemap.includes("'reembolsos/' => ['monthly', '0.5']"));
assert(sitemap.includes("'moderacion/' => ['monthly', '0.5']"));
assert(!sitemap.includes("'reembolsos' => ['monthly', '0.5']"));
assert(!sitemap.includes("'moderacion' => ['monthly', '0.5']"));

const guardedCopy = [
  fs.readFileSync('src/components/screens/legal/TerminosScreen.jsx', 'utf8'),
  fs.readFileSync('src/components/screens/ContactoScreen.jsx', 'utf8'),
].join('\n');
assert(!guardedCopy.includes('portal de clasificados líder en México'));
assert(!guardedCopy.includes('Respondemos en menos de 24 horas'));
assert(!guardedCopy.includes('respondemos en menos de 24 horas'));

console.log(`Sitemap shell contract OK: ${Object.keys(VERTICAL_SEO_ROUTES).length} verticals, ${Object.keys(VERTICAL_CANONICAL_ALIASES).length} noindex aliases, ${Object.keys(PUBLIC_SEO_ROUTES).length} public pages.`);
