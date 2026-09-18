import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const home = fs.readFileSync(new URL('../src/components/home/MercastoGoldenHome.jsx', import.meta.url), 'utf8');
const guards = fs.readFileSync(new URL('../scripts/check-recovery-guards.mjs', import.meta.url), 'utf8');

test('homepage never synthesizes ratings or review counts from ad ids', () => {
  assert.doesNotMatch(home, /4 \+ \(\(\(Number\(ad\.id\)/);
  assert.doesNotMatch(home, /\(\(Number\(ad\.id\) \|\| 1\) % 7\) \+ 1/);
  assert.match(home, /const hasReviews=Number\.isFinite\(rawRating\)&&rawRating>0&&rawCount>0/);
});

test('real homepage rating blocks are conditional and guarded against regressions', () => {
  assert.equal((home.match(/rating\.hasReviews &&/g) || []).length, 1);
  assert.match(guards, /src\/components\/home\/MercastoGoldenHome\.jsx/);
  assert.match(guards, /homepage rating social proof renders only when real review data exists/);
});

test('homepage never fabricates demo listings, prices, locations, or unsupported scale metrics', () => {
  assert.doesNotMatch(home, /id:'demo-/);
  assert.doesNotMatch(home, /Toyota Corolla 2020|iPhone 14 128GB|\$320,000|\+2\.5M|\+780K|98%/);
  assert.doesNotMatch(home, /millones de personas|Comunidad verificada|Transacciones seguras|Miles de anuncios/);
  assert.match(home, /Aún no hay anuncios para mostrar/);
  assert.match(home, /Todo México/);
});
