import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const v2 = fs.readFileSync('src/components/screens/HomeScreenV2.jsx', 'utf8');
const app = fs.readFileSync('src/App.jsx', 'utf8');

const renderHomeV2Block = app.slice(
  app.indexOf('const renderHomeV2Screen'),
  app.indexOf('const renderCatalogScreen'),
);

test('Home V2 keeps the auth-aware recommendations widget', () => {
  assert.match(v2, /const RecommendationsWidget = React\.lazy\(\(\) => import\('\.\.\/common\/RecommendationsWidget'\)\)/, 'widget must stay lazy');
  assert.match(v2, /<RecommendationsWidget\b/, 'widget is imported but never rendered');
  // Logged-in visitors get personalised picks; the widget falls back to
  // trending for guests, so the user id is the auth-aware input here.
  assert.match(v2, /userId=\{user\?\.id\}/, 'recommendations must receive the current user id');
  assert.match(v2, /limit=\{12\}/, 'recommendation limit changed');
  assert.match(v2, /onAdClick=\{handleViewAd\}/, 'recommendation click handler missing');
  assert.ok(renderHomeV2Block.includes('user={user}'), 'App.jsx does not forward user');
  assert.ok(renderHomeV2Block.includes('handleViewAd={handleViewAd}'), 'App.jsx does not forward handleViewAd');
});

test('Home V2 keeps the real-estate map, loaded only on intent', () => {
  assert.match(v2, /const MapV3 = React\.lazy\(\(\) => import\('\.\.\/common\/MapV3'\)\)/, 'Leaflet must stay lazy');
  assert.match(v2, /data-testid="home-real-estate-map-card"/, 'map card testid missing');
  // Leaflet must not load until the visitor shows intent.
  assert.match(v2, /onMouseEnter=\{\(\) => setReMapLoaded\(true\)\}/, 'map must wait for hover');
  assert.match(v2, /onTouchStart=\{\(\) => setReMapLoaded\(true\)\}/, 'map must wait for touch');
  assert.match(v2, /\{reMapLoaded \? \(/, 'map must be gated behind the intent flag');
  assert.match(v2, /homeMapCopy\.loading/, 'placeholder copy missing');
  assert.match(v2, /formatHomePropertiesLabel\(lang, selectedState\)/, 'map footer label missing');
  assert.ok(renderHomeV2Block.includes('selectedState={selectedState}'), 'App.jsx does not forward selectedState');
});

test('the heavy map bundle is not part of the V2 chunk', () => {
  const dist = 'dist/assets';
  if (!fs.existsSync(dist)) return; // build has not run in this checkout
  const chunks = fs.readdirSync(dist);
  const v2Chunk = chunks.find((name) => name.startsWith('HomeScreenV2') && name.endsWith('.js'));
  assert.ok(v2Chunk, 'HomeScreenV2 chunk missing - it must stay code-split');
  const source = fs.readFileSync(`${dist}/${v2Chunk}`, 'utf8');
  assert.doesNotMatch(source, /leaflet/i, 'Leaflet must not be bundled into the V2 chunk');
  assert.ok(chunks.some((name) => /^leaflet/.test(name)), 'Leaflet should exist as its own lazy chunk');
});
