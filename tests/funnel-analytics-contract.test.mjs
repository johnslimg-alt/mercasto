import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  FUNNEL_ANALYTICS_VERSION,
  FUNNEL_EVENTS,
  listingAnalyticsParams,
  registrationEventId,
} from '../src/utils/funnelAnalytics.js';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('canonical funnel names are stable across clients', () => {
  assert.equal(FUNNEL_ANALYTICS_VERSION, '2026-08-04');
  assert.deepEqual(
    [
      FUNNEL_EVENTS.SIGN_UP,
      FUNNEL_EVENTS.LISTING_PUBLISHED,
      FUNNEL_EVENTS.SEARCH,
      FUNNEL_EVENTS.LISTING_VIEWED,
      FUNNEL_EVENTS.CONTACT_OPENED,
      FUNNEL_EVENTS.MESSAGE_STARTED,
      FUNNEL_EVENTS.MESSAGE_SENT,
      FUNNEL_EVENTS.PURCHASE,
    ],
    [
      'sign_up',
      'listing_published',
      'search',
      'listing_viewed',
      'contact_opened',
      'message_started',
      'message_sent',
      'purchase',
    ],
  );
});

test('listing payload keeps canonical and backward-compatible identifiers', () => {
  assert.deepEqual(listingAnalyticsParams(42, 'vehicles', { source: 'detail' }), {
    content_type: 'classified_ad',
    listing_id: '42',
    ad_id: '42',
    content_id: 'ad_42',
    category: 'vehicles',
    source: 'detail',
  });
});

test('registration IDs satisfy backend allowlist and stay bounded', () => {
  const id = registrationEventId();
  assert.match(id, /^register_user_[A-Za-z0-9._:-]+$/);
  assert.ok(id.length <= 120);
});

test('web analytics enforces platform/version and avoids duplicate signup hooks', () => {
  const analytics = read('src/utils/analytics.js');
  const bridge = read('src/utils/metaCapiBridge.js');
  const app = read('src/App.jsx');
  const authContext = read('src/contexts/AuthContext.jsx');

  assert.match(analytics, /platform: 'web'/);
  assert.match(analytics, /analytics_contract_version: FUNNEL_ANALYTICS_VERSION/);
  assert.match(bridge, /trackEvent\(FUNNEL_EVENTS\.SIGN_UP/);
  assert.doesNotMatch(bridge, /sendMappedEvent\(EVENT_MAP\.sign_up/);
  assert.doesNotMatch(app, /events\.messageStarted\(channel\)/);
  assert.doesNotMatch(app, /event: `\$\{channel\}_click`/);
  assert.doesNotMatch(authContext, /events\.registered/);
});

test('category selection analytics is wired to primary discovery surfaces', () => {
  const analytics = read('src/utils/analytics.js');
  const app = read('src/App.jsx');
  const home = read('src/components/screens/HomeScreen.jsx');

  assert.match(analytics, /categorySelected: \(category, params = \{\}\) =>/);
  assert.match(analytics, /trackEvent\('category_selected', \{ category, \.\.\.params \}\)/);
  assert.match(app, /events\.categorySelected\(slug, \{ source: 'header_category' \}\)/);
  assert.match(home, /events\.categorySelected\(cat\.slug, \{ source: 'homepage_category_rail' \}\)/);
});
