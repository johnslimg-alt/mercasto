import assert from 'node:assert/strict';
import {
  backendDynamicRouteTemplates,
  backendRedirectRoutes,
  backendStaticScreens,
  expectedIntegrationWebRoutes,
  integrationWebRoutes,
  ogPreviewRoutes,
  redirectExpectations,
  sitemapRoutes,
  supportedDynamicTemplates,
} from './public-ui-route-policy.mjs';

const redirectPaths = Object.keys(redirectExpectations).map(path => path.slice(1)).sort();
assert.deepEqual(
  backendRedirectRoutes,
  redirectPaths,
  'Every backend redirect route must have an explicit production redirect expectation.',
);

assert.deepEqual(
  backendDynamicRouteTemplates,
  [...supportedDynamicTemplates].sort(),
  'Every dynamic browser route must have an explicit sample resolver.',
);

// Explicit allowlist instead of a bare count: the composited social-preview route answers
// with image bytes rather than a browser screen, so it is deliberately NOT a visual
// sample-resolver target. Adding another one is a deliberate change, not a silent one.
assert.deepEqual(
  ogPreviewRoutes,
  ['share/ads/{id}/og.jpg'],
  'Composited social-preview routes must stay on the explicit non-visual allowlist.',
);

assert.deepEqual(
  integrationWebRoutes,
  [...expectedIntegrationWebRoutes].sort(),
  'Web-middleware API/integration routes require an explicit non-visual classification.',
);

// Explicit allowlist instead of a bare count: every sitemap XML route must stay non-visual, and
// adding/renaming one (e.g. the `/sitemap-ads-{chunk}.xml` inventory chunks) is a deliberate change.
assert.deepEqual(
  sitemapRoutes,
  [
    'sitemap-ads-{chunk}.xml',
    'sitemap-ads.xml',
    'sitemap-categories.xml',
    'sitemap-main.xml',
    'sitemap-states.xml',
    'sitemap.xml',
  ].sort(),
  'Sitemap XML routes must stay on the explicit non-visual allowlist.',
);
assert.equal(backendStaticScreens.length, 40, 'Expected all 40 current static backend browser surfaces.');
assert.equal(
  new Set(backendStaticScreens.map(screen => screen.path)).size,
  backendStaticScreens.length,
  'Static browser visual paths must be unique.',
);

console.log(JSON.stringify({
  staticBrowserSurfaces: backendStaticScreens.length,
  redirectRoutes: backendRedirectRoutes.length,
  dynamicBrowserRoutes: backendDynamicRouteTemplates.length,
  sitemapRoutes: sitemapRoutes.length,
  integrationWebRoutes: integrationWebRoutes.length,
}, null, 2));
