import { readFileSync } from 'node:fs';

const signatures = JSON.parse(
  readFileSync(new URL('../docs/route-inventory-signatures.json', import.meta.url), 'utf8'),
);

const webGetRoutes = signatures.filter(route => (
  route.middleware.includes('web')
  && route.method.split('|').includes('GET')
));

export const integrationWebRoutes = webGetRoutes
  .filter(route => route.uri.startsWith('api/'))
  .map(route => route.uri)
  .sort();

const browserRoutes = webGetRoutes.filter(route => !route.uri.startsWith('api/'));

export const sitemapRoutes = browserRoutes
  .filter(route => route.action.includes('SitemapController'))
  .map(route => route.uri)
  .sort();

export const backendRedirectRoutes = browserRoutes
  .filter(route => route.action.includes('RedirectController'))
  .map(route => route.uri)
  .sort();

// Composited social previews (`/share/ads/{id}/og.jpg`) answer with image bytes, not a
// browser screen, so they have no visual sample resolver and must never be demanded as
// one. Classified explicitly -- exactly like the sitemap XML routes -- so that adding
// another non-visual dynamic route stays a deliberate, reviewed change instead of
// silently widening the set of routes the visual matrix claims to cover.
export const ogPreviewRoutes = browserRoutes
  .filter(route => route.action.includes('ShareOgImageController'))
  .map(route => route.uri)
  .sort();

export const backendDynamicRouteTemplates = browserRoutes
  .filter(route => (
    route.uri.includes('{')
    && !route.action.includes('SitemapController')
    && !route.action.includes('ShareOgImageController')
  ))
  .map(route => route.uri)
  .sort();

function routePath(uri) {
  return uri === '/' ? '/' : `/${uri}`;
}

function screenName(uri) {
  if (uri === '/') return 'home';
  return uri
    .replace(/[{}]/g, '')
    .replaceAll('/', '--')
    .replaceAll('_', '-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export const backendStaticScreens = browserRoutes
  .filter(route => (
    !route.action.includes('RedirectController')
    && !route.action.includes('SitemapController')
    && !route.uri.includes('{')
  ))
  .map(route => ({ name: screenName(route.uri), path: routePath(route.uri) }))
  .sort((a, b) => a.path.localeCompare(b.path));

export const redirectExpectations = {
  '/acerca-de': '/sobre-mercasto',
  '/autos': '/motor',
  '/help': '/ayuda',
  '/informatica': '/tecnologia',
  '/privacy': '/privacidad',
  '/safety': '/seguridad',
  '/telefonia': '/telefonos',
  '/terms': '/terminos',
};

export const supportedDynamicTemplates = [
  'ads/{id}',
  'share/ads/{id}',
];

export const expectedIntegrationWebRoutes = [
  'api/auth/{provider}/callback',
  'api/auth/{provider}/redirect',
];

export const clientOnlyScreens = [
  { name: 'login', path: '/login', selector: 'input[name="email"]' },
  { name: 'register', path: '/register', selector: 'input[name="name"]' },
  { name: 'post-auth-gate', path: '/post', selector: 'input[name="email"]' },
  { name: 'profile-auth-gate', path: '/profile', selector: 'input[name="email"]' },
  { name: 'admin-auth-gate', path: '/admin', selector: 'input[name="email"]' },
];
