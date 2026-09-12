import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { isCatalogReference } from '../src/utils/catalogInventory.js';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('isCatalogReference only accepts explicit placeholder markers', () => {
  for (const marker of [true, 1, '1', 'true']) {
    assert.equal(isCatalogReference({ is_catalog_filler: marker }), true, `marker ${String(marker)}`);
  }

  // Ambiguous values must stay real inventory: a real ad may never lose impression
  // tracking, views or SEO indexing because of an unexpected payload shape.
  for (const marker of [false, 0, '0', 'false', '', null, undefined, {}, []]) {
    assert.equal(isCatalogReference({ is_catalog_filler: marker }), false, `marker ${String(marker)}`);
  }

  assert.equal(isCatalogReference(undefined), false);
  assert.equal(isCatalogReference(null), false);
  assert.equal(isCatalogReference({}), false);
});

test('AdCard keeps impression tracking for every non-placeholder listing', () => {
  const card = read('src/components/common/AdCard.jsx');

  // Both layouts must attach the impression observer exactly when the ad is not a
  // catalog reference, and never for an ambiguous/real ad.
  const guardedRefs = card.match(/ref=\{isCatalogFiller \? null : observeRef\}/g) || [];
  assert.equal(guardedRefs.length, 2, 'both AdCard layouts must guard the impression ref');

  // The placeholder badge is the explicit UI marker that a visitor is not looking
  // at real seller inventory.
  const placeholderBadges = card.match(/\{isCatalogFiller && <span className="badge[^>]*>\{detailCopy\.catalogTitle\}<\/span>\}/g) || [];
  assert.equal(placeholderBadges.length, 2, 'both AdCard layouts must label placeholders');

  // Promotions/highlights are seller achievements and must never decorate a placeholder.
  assert.match(card, /\{!isCatalogFiller && isDestacado && <span className="badge/);
});

test('App skips view counting and indexing only for explicit placeholders', () => {
  const app = read('src/App.jsx');

  assert.match(app, /if \(isCatalogReference\(ad\)\) return;/);
  assert.match(app, /const isViewedCatalogFiller = isCatalogReference\(viewedAd\);/);
  assert.doesNotMatch(app, /if \(ad\.is_catalog_filler\) return;/);
  assert.doesNotMatch(app, /Boolean\(viewedAd\?\.is_catalog_filler\)/);
});

test('Map/list split and bulk eligibility share the explicit placeholder marker', () => {
  assert.match(read('src/components/common/SplitViewContainer.jsx'), /ads\.filter\(ad => !isCatalogReference\(ad\)\)/);
  assert.match(read('src/utils/adBulkEligibility.js'), /!isCatalogReference\(ad\)/);
});
