import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const home = fs.readFileSync('src/components/screens/HomeScreen.jsx', 'utf8');

test('home does not present synthetic time-limited promotion claims', () => {
  for (const key of ['deal_of_day', 'up_to_40', 'ends_in_8h', 'zero_comm']) {
    assert.doesNotMatch(home, new RegExp(`t\\.${key}\\b`), key);
  }
});

test('home recommendations are personalized-only so guests keep one trending rail', () => {
  assert.match(home, /\{user && \(\s*<section[\s\S]*?<RecommendationsWidget[\s\S]*?userId=\{user\.id\}/);
  assert.doesNotMatch(home, /userId=\{user\?\.id\}/);
});
