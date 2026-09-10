import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const home = fs.readFileSync('src/components/screens/HomeScreen.jsx', 'utf8');

const sourceFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return sourceFiles(full);
  return /\.(?:js|jsx|mjs|cjs)$/.test(entry.name) ? [full] : [];
});

test('home vertical discovery never falls back to synthetic marketplace listings', () => {
  for (const legacy of ['spotlightRealEstate', 'jobsBoard', 'servicesMarketplace', 'automotiveDeals', 'mockFallbacks']) {
    assert.equal(home.includes(legacy), false, legacy);
  }
  for (const source of ['safeRealEstateAds', 'safeJobAds', 'safeServiceAds', 'safeAutomotiveAds']) {
    assert.match(home, new RegExp(`${source}\\.slice\\(0, 3\\)\\.map\\(`), source);
  }
  for (const legacyMarker of ['job-logo-badge', 'job.role', 'job.salary', 'srv.stars', 'srv.img', 'srv.desc}', 'car.specs', 'car.badge', 'item.specs', 'item.img']) {
    assert.equal(home.includes(legacyMarker), false, legacyMarker);
  }
  assert.equal((home.match(/\.filter\(item => item\?\.id\)/g) || []).length, 4);
});

test('production source cannot import the synthetic marketplace dataset', () => {
  for (const file of sourceFiles('src')) {
    const source = fs.readFileSync(file, 'utf8');
    assert.equal(source.includes('constants/mockData'), false, file);
  }
});
