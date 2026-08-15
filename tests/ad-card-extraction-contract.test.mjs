import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('App delegates listing-card rendering to the reusable AdCard', () => {
  const app = read('src/App.jsx');
  assert.match(app, /import AdCard from '\.\/components\/common\/AdCard'/);
  assert.match(app, /const renderAdCard = \(ad, options = \{\}\) => \([\s\S]*?<AdCard/);
  assert.doesNotMatch(app, /const renderAdCard = \(ad, options = \{\}\) => \{[\s\S]*?const isCatalogFiller/);
});

test('AdCard preserves current listing-card behaviors', () => {
  const card = read('src/components/common/AdCard.jsx');
  assert.match(card, /Boolean\(ad\.is_catalog_filler\)/);
  assert.match(card, /options\.priority \? 'eager' : 'lazy'/);
  assert.match(card, /localizedText\(ad\.title, lang\)/);
  assert.match(card, /handleToggleFavorite\(e, ad\.id\)/);
  assert.match(card, /navigate\(currentUser \? '\/post' : '\/vendedores'/);
  assert.match(card, />\{t\.ct_contact_btn\}<\/button>/);
  assert.match(card, /if \(!hasReviews\) return null/);
  assert.doesNotMatch(card, /4 \+ \(\(\(Number\(ad\.id\)/);
});
