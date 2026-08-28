import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  backendStaticScreens,
  clientOnlyScreens,
  redirectExpectations,
} from './public-ui-route-policy.mjs';
import {
  clientDynamicPatterns,
  clientWildcardPattern,
  protectedClientScreens,
  publicClientScreens,
  staticClientRedirects,
} from './client-spa-route-policy.mjs';

const source = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const literalReactRoutes = [...new Set(
  [...source.matchAll(/<Route\s+path="([^"]+)"/g)].map(match => match[1]),
)].sort();

const backendCovered = new Set([
  ...backendStaticScreens.map(screen => screen.path),
  ...Object.keys(redirectExpectations),
  '/ads/:id',
]);

const explicitClientRoutes = new Set([
  ...clientOnlyScreens.map(screen => screen.path),
  ...protectedClientScreens.map(screen => screen.path),
  ...publicClientScreens.map(screen => screen.path),
  ...Object.keys(staticClientRedirects),
  ...clientDynamicPatterns,
  clientWildcardPattern,
]);

const uncovered = literalReactRoutes.filter(path => !backendCovered.has(path) && !explicitClientRoutes.has(path));
const staleExplicit = [...explicitClientRoutes].filter(path => !literalReactRoutes.includes(path));

assert.deepEqual(uncovered, [], `Unclassified literal React routes: ${uncovered.join(', ')}`);
assert.deepEqual(staleExplicit, [], `Client route policy contains paths no longer present in App.jsx: ${staleExplicit.join(', ')}`);
assert.equal(literalReactRoutes.length, 55, 'Literal React route count changed; classify every new/removed route deliberately.');

console.log(JSON.stringify({
  literalReactRoutes: literalReactRoutes.length,
  backendCoveredLiteralRoutes: literalReactRoutes.filter(path => backendCovered.has(path)).length,
  explicitClientRoutes: literalReactRoutes.filter(path => explicitClientRoutes.has(path)).length,
  uncoveredRoutes: uncovered.length,
}, null, 2));
