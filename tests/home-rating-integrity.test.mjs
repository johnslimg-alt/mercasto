import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const home = fs.readFileSync(new URL('../src/components/screens/HomeScreen.jsx', import.meta.url), 'utf8');
const guards = fs.readFileSync(new URL('../scripts/check-recovery-guards.mjs', import.meta.url), 'utf8');

test('homepage never synthesizes ratings or review counts from ad ids', () => {
  assert.doesNotMatch(home, /4 \+ \(\(\(Number\(ad\.id\)/);
  assert.doesNotMatch(home, /\(\(Number\(ad\.id\) \|\| 1\) % 7\) \+ 1/);
  assert.match(home, /const hasReviews = Number\.isFinite\(rawRating\)[\s\S]*?rawCount > 0/);
});

test('real homepage rating blocks are conditional and guarded against regressions', () => {
  assert.equal((home.match(/rating\.hasReviews &&/g) || []).length, 3);
  assert.match(guards, /src\/components\/screens\/HomeScreen\.jsx/);
  assert.match(guards, /homepage rating social proof renders only when real review data exists/);
});
