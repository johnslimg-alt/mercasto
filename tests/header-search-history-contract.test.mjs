import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/App.jsx', 'utf8');

function between(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Unable to isolate source segment: ${start}`);
  return source.slice(from, to);
}

test('header search input changes do not navigate away before submit', () => {
  const desktopLine = source.split('\n').find(line => line.includes('data-testid="desktop-search-input"')) || '';
  const mobileLine = source.split('\n').find(line => line.includes('data-testid="mobile-search-input"')) || '';
  assert.ok(desktopLine.includes('setSearchQuery(v)'));
  assert.ok(mobileLine.includes('setSearchQuery(v)'));
  assert.ok(!desktopLine.includes("setCurrentTab('home')"));
  assert.ok(!mobileLine.includes("setCurrentTab('home')"));
});

test('executeSearch performs one route navigation and preserves post-draft cleanup', () => {
  const executeSearch = between('const executeSearch = useCallback(', 'const applyHeaderLocation = useCallback');
  assert.ok(!executeSearch.includes("setCurrentTab('home')"), 'executeSearch must not insert an intermediate / history entry');
  assert.ok(executeSearch.includes("if (currentTab === 'post') discardPostDraft();"));
  assert.equal((executeSearch.match(/navigate\(/g) || []).length, 1, 'executeSearch must have one navigation call');
});

test('post draft cleanup remains shared by tab changes and header search', () => {
  assert.ok(source.includes('const discardPostDraft = useCallback(() =>'));
  const tabNavigation = between('const setCurrentTab = useCallback(', 'const handleHeaderCategoryClick = useCallback');
  assert.ok(tabNavigation.includes("if (currentTab === 'post' && tab !== 'post') discardPostDraft();"));
});
