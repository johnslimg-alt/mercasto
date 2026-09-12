import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  LISTING_PATH_PREFIX,
  MIN_INDEXABLE_DESCRIPTION_LENGTH,
  MIN_INDEXABLE_TITLE_LENGTH,
  ROBOTS_INDEXABLE,
  ROBOTS_NOINDEX,
  ROBOTS_RESULTS_INDEXABLE,
  assessListingContent,
  assessListingIndexability,
  isFilteredResultsUrl,
  listingPath,
  listingUrl,
  resultsPageRobots,
} from '../src/utils/seoIndexability.js';

const itemList = fs.readFileSync('src/components/seo/ItemListSchema.jsx', 'utf8');
const app = fs.readFileSync('src/App.jsx', 'utf8');
const adDetail = fs.readFileSync('src/components/screens/AdDetailScreen.jsx', 'utf8');

// Deterministic, relative to the run: a fixed calendar date would start failing
// once CI runs past it.
const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;
const FUTURE_EXPIRY = new Date(NOW + 7 * DAY_MS).toISOString();
const PAST_EXPIRY = new Date(NOW - DAY_MS).toISOString();

const genuineListing = (overrides = {}) => ({
  id: 4321,
  status: 'active',
  is_catalog_filler: false,
  title: { es: 'Bicicleta urbana rodada 29', en: 'City bicycle' },
  description: { es: 'Bicicleta urbana lista para rodar por toda la ciudad, con frenos revisados.', en: 'Ready to ride.' },
  image_url: '["ads/bicicleta.webp"]',
  expires_at: FUTURE_EXPIRY,
  ...overrides,
});

// --- Defect 1: structured data must point at a route that actually exists ---

test('listing schema URLs use the canonical /ads/{id} route, never the dead /ad/{id} route', () => {
  assert.equal(LISTING_PATH_PREFIX, '/ads');
  assert.equal(listingPath(4321), '/ads/4321');
  assert.equal(listingUrl(4321, 'https://www.mercasto.com'), 'https://www.mercasto.com/ads/4321');
  assert.equal(listingUrl(4321, 'https://www.mercasto.com/'), 'https://www.mercasto.com/ads/4321');

  // The route that broke the highest-value schema: /ad/{id} is not a registered
  // server route or SPA route, so it must not appear anywhere in the client.
  // Plain substring checks: these scan source text, they are not URL validators.
  assert.equal(
    itemList.includes('mercasto.com/ad/'),
    false,
    'ItemListSchema still emits the dead /ad/{id} URL',
  );
  assert.equal(itemList.includes('/ad/${'), false, 'ItemListSchema still builds /ad/{id} inline');
  assert.match(itemList, /listingUrl\(item\.id\)/, 'ItemListSchema must build URLs through listingUrl');
});

test('no client module hardcodes a listing URL outside the canonical route', () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(?:jsx?|tsx?)$/.test(entry.name)) {
        const source = fs.readFileSync(full, 'utf8');
        if (source.includes('mercasto.com/ad/')) offenders.push(`${full}: dead /ad/ URL`);
        if (source.includes('mercasto.com/ads/')) offenders.push(`${full}: hardcoded /ads/ URL`);
      }
    }
  };
  walk('src');

  assert.deepEqual(offenders, []);
});

test('listing structured data resolves to an absolute URL on the requesting origin', () => {
  const origin = 'https://www.mercasto.com';
  assert.equal(listingUrl(99, origin), `${origin}/ads/99`);
  // Offer URL emitted by the ad detail screen must match the same route.
  assert.match(adDetail, /"url": listingUrl\(ad\.id\)/);
  // Canonical + Product offer emitted by the app shell must match too, and the
  // shell must not carry its own hardcoded listing URL (the walk above covers
  // every src file; this pins the specific regression).
  assert.match(app, /listingUrl\(viewedAd\.id\)/);
  assert.equal(
    app.includes('mercasto.com/ads/'),
    false,
    'App.jsx must not hardcode a listing URL',
  );
});

// --- Defect 2: indexability policy ---

test('a genuine published listing with a live expiry is indexable', () => {
  const verdict = assessListingIndexability(genuineListing());

  assert.equal(verdict.indexable, true);
  assert.equal(verdict.robots, ROBOTS_INDEXABLE);
  assert.deepEqual(verdict.reasons, []);
  assert.match(verdict.robots, /^index,follow/);
});

test('the page policy mirrors the availability contract shared with the ads sitemap', () => {
  // App\Support\ListingIndexability requires a non-null future expiry. A listing with
  // no expiry has no advertised lifetime, so the sitemap will not publish it — the page
  // must not claim an indexability that the sitemap contradicts.
  const verdict = assessListingIndexability(genuineListing({ expires_at: null }));

  assert.equal(verdict.indexable, false);
  assert.equal(verdict.robots, ROBOTS_NOINDEX);
  assert.ok(verdict.reasons.includes('no_expiry'), 'missing expiry must be reported as no_expiry');
});

test('the explicit catalog-reference marker decides indexability, never truthiness', () => {
  // Only an explicit placeholder marker may remove a listing from the index, so an
  // unexpected payload shape can never de-index real inventory (utils/catalogInventory.js).
  for (const marker of [true, 1, '1', 'true']) {
    assert.equal(
      assessListingIndexability(genuineListing({ is_catalog_filler: marker })).indexable,
      false,
      `marker ${String(marker)} must be a catalog reference`,
    );
  }

  for (const marker of [false, 0, '0', 'false', '', null, undefined, {}, []]) {
    assert.equal(
      assessListingIndexability(genuineListing({ is_catalog_filler: marker })).indexable,
      true,
      `marker ${String(marker)} must stay real inventory`,
    );
  }
});

test('every non-indexable listing reason yields noindex,follow', () => {
  const cases = {
    'catalog reference': genuineListing({ is_catalog_filler: true }),
    'placeholder title': genuineListing({ title: { es: 'test 1' } }),
    'thin title': genuineListing({ title: { es: 'ab' } }),
    'thin description': genuineListing({ description: { es: '   ' } }),
    'expired listing': genuineListing({ expires_at: PAST_EXPIRY }),
    'listing without an expiry': genuineListing({ expires_at: null }),
    'unpublished listing': genuineListing({ status: 'pending' }),
    'missing listing': null,
  };

  for (const [label, ad] of Object.entries(cases)) {
    const verdict = assessListingIndexability(ad, { now: NOW });
    assert.equal(verdict.indexable, false, `${label} must not be indexable`);
    assert.equal(verdict.robots, ROBOTS_NOINDEX, `${label} must emit noindex`);
    assert.ok(verdict.reasons.length > 0, `${label} must explain why`);
  }
});

test('content assessment matches the thresholds the ads sitemap publishes on', () => {
  assert.deepEqual(assessListingContent(genuineListing()).reasons, []);
  assert.ok(assessListingContent(genuineListing({ is_catalog_filler: true })).reasons.includes('catalog_filler'));
  assert.ok(assessListingContent(genuineListing({ title: { es: 'Demo' } })).reasons.includes('placeholder_title'));
  assert.ok(assessListingContent(genuineListing({ title: { es: 'ab' } })).reasons.includes('thin_title'));
  assert.ok(assessListingContent(genuineListing({ description: { es: 'ok' } })).reasons.includes('thin_description'));

  // Thresholds and placeholder list must stay identical to SitemapController.
  const sitemap = fs.readFileSync('backend/app/Http/Controllers/Api/SitemapController.php', 'utf8');
  assert.match(sitemap, new RegExp(`ADS_MIN_TITLE_LENGTH = ${MIN_INDEXABLE_TITLE_LENGTH};`));
  assert.match(sitemap, new RegExp(`ADS_MIN_DESCRIPTION_LENGTH = ${MIN_INDEXABLE_DESCRIPTION_LENGTH};`));
  assert.match(sitemap, /'prueba',/);
  assert.match(sitemap, /'wrefrg',/);
});

// --- Defect 3 (related): server and client must agree on filtered pages ---

test('filtered results pages are noindex while clean landing pages stay indexable', () => {
  const filtered = ['?search=casa', '?category=motor', '?q=casa', '?subcategory=casas', '?page=2', '?lat=19.4&lng=-99.1&radius=10'];
  for (const search of filtered) {
    assert.equal(isFilteredResultsUrl('/', search), true, `/?${search} must be a filtered view`);
    assert.equal(resultsPageRobots('/', search), ROBOTS_NOINDEX, `/?${search} must be noindex`);
    assert.equal(resultsPageRobots('/listings', search), ROBOTS_NOINDEX, `/listings${search} must be noindex`);
  }

  const decorations = ['', '?ad=4321', '?store=7', '?utm_source=newsletter', '?fbclid=abc'];
  for (const search of decorations) {
    assert.equal(isFilteredResultsUrl('/', search), false, `/${search} is not a filtered view`);
    // Clean results pages keep the directive the Laravel shell already emits,
    // so the hydrated DOM does not contradict the server-rendered HTML.
    assert.equal(resultsPageRobots('/', search), ROBOTS_RESULTS_INDEXABLE, `/${search} must stay indexable`);
  }

  // Non-results routes are governed by their own policy.
  assert.equal(isFilteredResultsUrl('/ads/4321', '?search=casa'), false);
});

test('app shell derives robots from the shared policy instead of a private copy', () => {
  assert.match(app, /resultsPageRobots\(location\.pathname, location\.search\)/);
  assert.match(app, /assessListingIndexability\(viewedAd/);
  assert.doesNotMatch(app, /const contentFilterKeys = \[/);
});
