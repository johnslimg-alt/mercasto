import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const v2 = fs.readFileSync('src/components/screens/HomeScreenV2.jsx', 'utf8');
const app = fs.readFileSync('src/App.jsx', 'utf8');

const renderHomeV2Block = app.slice(
  app.indexOf('const renderHomeV2Screen'),
  app.indexOf('const renderCatalogScreen'),
);

test('Home V2 headline reports the real API total, never the loaded page length', () => {
  // `safeAds` is one loaded page; printing its length reads as "ads on the
  // marketplace" and is exactly the fake counter the launch rules forbid.
  assert.doesNotMatch(
    v2,
    /safeAds\.length[^\n]{0,60}toLocaleString/,
    'headline must not render safeAds.length as a total',
  );
  assert.ok(
    v2.includes('realAdsTotal.toLocaleString()'),
    'headline must render the real total',
  );
  assert.match(
    v2,
    /\{realAdsTotal > 0 && \(/,
    'the counter must only render when a positive total is known',
  );
});

test('Home V2 accepts adsTotal through its prop surface', () => {
  assert.match(v2, /activeCat,\s*adsTotal,\s*executeSearch/, 'adsTotal missing from V2 props');
  assert.match(v2, /const parsedAdsTotal = Number\(adsTotal\)/, 'adsTotal must be parsed defensively');
});

test('App.jsx forwards the API total into Home V2', () => {
  assert.ok(renderHomeV2Block.length > 0, 'renderHomeV2Screen block not found');
  assert.match(renderHomeV2Block, /adsTotal=\{adsTotal\}/, 'adsTotal is not forwarded to HomeScreenV2');
});
