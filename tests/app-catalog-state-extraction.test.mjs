import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const hook = fs.readFileSync('src/app/useCatalogState.js', 'utf8');

const states = [
  'selectedState', 'activeCat', 'activeSub', 'minPrice', 'maxPrice',
  'conditionFilter', 'dynamicFilters', 'loadingMore', 'currentPage',
  'debouncedSearch', 'debouncedLocInput', 'hasMore',
];

test('App delegates catalog filter and pagination state to a focused hook', () => {
  assert.match(app, /useCatalogState\(\)/);
  for (const name of states) assert.doesNotMatch(app, new RegExp(`const \\[${name}, set`));
});

test('catalog state preserves existing safe defaults', () => {
  assert.equal((hook.match(/useState\(''\)/g) || []).length, 7);
  assert.equal((hook.match(/useState\(\[\]\)/g) || []).length, 1);
  assert.equal((hook.match(/useState\(\{\}\)/g) || []).length, 1);
  assert.equal((hook.match(/useState\(false\)/g) || []).length, 1);
  assert.equal((hook.match(/useState\(1\)/g) || []).length, 1);
  assert.equal((hook.match(/useState\(true\)/g) || []).length, 1);
});
