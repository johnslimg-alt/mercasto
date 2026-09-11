import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const v2 = fs.readFileSync('src/components/screens/HomeScreenV2.jsx', 'utf8');
const legacy = fs.readFileSync('src/components/screens/HomeScreen.jsx', 'utf8');
const util = fs.readFileSync('src/utils/automotiveQuickFilters.js', 'utf8');

test('Home V2 keeps the real-estate quick filters', () => {
  assert.match(v2, /data-testid="home-real-estate-rent"/, 'rent shortcut missing');
  for (const term of ['renta', 'venta', 'comercial']) {
    assert.ok(
      v2.includes(`runSearch('${term}', 'inmobiliaria')`),
      `${term} shortcut must run the same search as legacy`,
    );
  }
});

test('Home V2 keeps the automotive quick-filter row', () => {
  assert.match(v2, /data-testid="home-auto-filter-row"/, 'filter row missing');
  assert.match(v2, /data-testid="home-auto-year-filter"/, 'year filter missing');
  assert.match(v2, /data-testid="home-auto-price-filter"/, 'price filter missing');

  // Same search contract as legacy: a year window via dynamicFilters, and a
  // max-price bucket, each tagged with the same analytics source.
  assert.match(v2, /dynamicFilters: \{ year: \{ min: year, max: year \} \}/, 'year window contract changed');
  assert.ok(v2.includes("source: 'home_auto_year'"), 'year analytics source changed');
  assert.ok(v2.includes("source: 'home_auto_price'"), 'price analytics source changed');
  assert.match(v2, /\{ maxPrice, source: 'home_auto_price' \}/, 'max-price contract changed');

  // Brand shortcuts come from the shared vocabulary (one list, not two
  // spellings), and the reset-to-all shortcut stays.
  assert.match(v2, /AUTOMOTIVE_QUICK_BRANDS\.map\(/, 'brand shortcuts must come from the shared list');
  assert.ok(v2.includes("runSearch(brand, 'motor')"), 'brand shortcut handler missing');
  assert.ok(v2.includes("runSearch('', 'motor')"), 'reset-to-all shortcut missing');
  for (const brand of ['Nissan', 'VW', 'Toyota', 'Honda']) {
    assert.ok(util.includes(`'${brand}'`), `shared brand list is missing ${brand}`);
  }
});

test('legacy and V2 build the automotive row from one shared vocabulary', () => {
  assert.match(util, /export function getAutomotiveQuickYears/, 'shared year helper missing');
  assert.match(util, /export const AUTOMOTIVE_QUICK_BRANDS/, 'shared brand list missing');
  assert.match(util, /export const AUTOMOTIVE_PRICE_OPTIONS/, 'shared price buckets missing');

  assert.match(legacy, /import \{ getAutomotiveQuickYears \} from '\.\.\/\.\.\/utils\/automotiveQuickFilters'/, 'legacy must use the shared helper');
  assert.match(v2, /import \{ AUTOMOTIVE_PRICE_OPTIONS, AUTOMOTIVE_QUICK_BRANDS, getAutomotiveQuickYears \} from '\.\.\/\.\.\/utils\/automotiveQuickFilters'/);
  // No second inlined year generator may creep back into either screen.
  assert.doesNotMatch(legacy, /Array\.from\(\{ length: 12 \}/, 'legacy still inlines the year window');
  assert.doesNotMatch(v2, /Array\.from\(\{ length: 12 \}/, 'V2 must not inline the year window');
});

test('the quick rows scroll without a visible scrollbar', () => {
  const rows = v2.match(/className="v2-quick-row v2-scroll"/g) || [];
  assert.equal(rows.length, 2, 'both quick rows must use the hidden-scrollbar class');
});
