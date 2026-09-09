import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const home = fs.readFileSync('src/components/screens/HomeScreen.jsx', 'utf8');

test('home vertical discovery never falls back to synthetic marketplace listings', () => {
  assert.equal(home.includes("import('../../constants/mockData')"), false);
  for (const legacy of ['spotlightRealEstate', 'jobsBoard', 'servicesMarketplace', 'automotiveDeals', 'mockFallbacks']) {
    assert.equal(home.includes(legacy), false, legacy);
  }
  for (const source of ['safeRealEstateAds', 'safeJobAds', 'safeServiceAds', 'safeAutomotiveAds']) {
    assert.match(home, new RegExp(`${source}\\.slice\\(0, 3\\)\\.map\\(`), source);
  }
});
