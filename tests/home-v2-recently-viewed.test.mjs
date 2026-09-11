import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const v2 = fs.readFileSync('src/components/screens/HomeScreenV2.jsx', 'utf8');

test('Home V2 restores the recently viewed rail from local storage', () => {
  assert.match(v2, /import \{ clearRecentlyViewed, getRecentlyViewed \} from '\.\.\/\.\.\/utils\/recentlyViewed'/);
  assert.match(v2, /useState\(\(\) => \{[\s\S]{0,160}getRecentlyViewed\(\)/, 'recently viewed must seed from storage');
  assert.match(v2, /recentAds\.length > 0 &&/, 'the rail must stay hidden when there is no history');
  assert.match(v2, /data-testid="v2-recently-viewed"/, 'rail testid missing');
});

test('Home V2 clearing the history does not reload the page', () => {
  assert.match(v2, /const clearRecent = React\.useCallback\(\(\) => \{[\s\S]{0,120}clearRecentlyViewed\(\);[\s\S]{0,80}setRecentAds\(\[\]\)/);
  // Legacy reloaded the whole document to redraw; V2 just drops the state.
  const clearBlock = v2.slice(v2.indexOf('const clearRecent'), v2.indexOf('const clearRecent') + 260);
  assert.doesNotMatch(clearBlock, /window\.location\.reload/, 'clearing must not force a document reload');
});

test('recently viewed cards degrade gracefully', () => {
  assert.match(v2, /loading="lazy"/, 'thumbnails must lazy-load');
  assert.match(v2, /placeholder-ad\.svg/, 'a missing thumbnail must fall back to the placeholder');
  assert.match(v2, /onError=\{\(e\) => \{/, 'broken thumbnails must be handled');
  // A stored entry has no live ad object, so the click falls back to a search
  // on the remembered title - the same behaviour as the legacy rail.
  assert.match(v2, /onClick=\{\(\) => runSearch\(title\)\}/, 'card click must search the remembered title');
  assert.match(v2, /localizedText\(ad\.title\)/, 'titles must be localized');
  assert.match(v2, /formatNumber\(ad\.price \|\| 0, lang\)/, 'prices must use the active locale');
});
