import assert from 'node:assert/strict';
import {
  backendDynamicRouteTemplates,
  backendRedirectRoutes,
  backendStaticScreens,
  expectedIntegrationWebRoutes,
  integrationWebRoutes,
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

assert.deepEqual(
  integrationWebRoutes,
  [...expectedIntegrationWebRoutes].sort(),
  'Web-middleware API/integration routes require an explicit non-visual classification.',
);

assert.equal(sitemapRoutes.length, 5, 'Expected the five sitemap XML routes to remain non-visual.');
assert.equal(backendStaticScreens.length, 39, 'Expected all 39 current static backend browser surfaces.');
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
