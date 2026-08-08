import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('HomeScreen delegates the three low-risk discovery sections', () => {
  const home = read('src/components/screens/HomeScreen.jsx');
  assert.match(home, /<PopularSearchesSection t=\{t\} runSearch=\{runSearch\} \/>/);
  assert.match(home, /<CitiesSection[\s\S]*?applyCityFilter=\{applyCityFilter\}/);
  assert.match(home, /<NewsletterSection t=\{t\} showHomeToast=\{showHomeToast\} \/>/);
});

test('extracted sections preserve search, city and newsletter behavior', () => {
  const sections = read('src/components/home/HomeDiscoverySections.jsx');
  assert.match(sections, /href=\{`\/listings\?q=\$\{encodeURIComponent\(term\)\}`\}/);
  assert.match(sections, /runSearch\(term\)/);
  assert.match(sections, /href=\{`\/listings\?location=\$\{encodeURIComponent\(city\.name\)\}`\}/);
  assert.match(sections, /applyCityFilter\(city\.name\)/);
  assert.match(sections, /onViewAllMexico\(\)/);
  assert.match(sections, /showHomeToast\('Gracias por suscribirte\.'\)/);
  assert.match(sections, /e\.target\.reset\(\)/);
});
