import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  FUNNEL_ANALYTICS_VERSION,
  FUNNEL_EVENTS,
  listingAnalyticsParams,
  registrationEventId,
} from '../src/utils/funnelAnalytics.js';
import {
  countRegistrationEmitters,
  findEmailRegistrationEmitters,
} from '../scripts/funnel-emitter-contract.mjs';

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
  const openAiBridge = read('src/utils/openaiAdsBridge.js');
  const tiktok = read('src/utils/tiktokPixel.js');
  const app = read('src/App.jsx');
  // The live auth surface. The AppProviders/AuthContext subtree is unreachable
  // (no importers repo-wide, no useAuth consumers) and is slated for removal; the
  // live app authenticates through this hook plus localStorage.auth_token, so the
  // anti-duplication contract has to be asserted here to keep executing.
  const liveAuthState = read('src/app/useAuthSessionState.js');

  assert.match(analytics, /platform: 'web'/);
  assert.match(analytics, /analytics_contract_version: FUNNEL_ANALYTICS_VERSION/);
  assert.match(bridge, /trackEvent\(FUNNEL_EVENTS\.SIGN_UP/);
  assert.doesNotMatch(bridge, /sendMappedEvent\(EVENT_MAP\.sign_up/);
  assert.doesNotMatch(app, /events\.messageStarted\(channel\)/);
  assert.doesNotMatch(app, /event: `\$\{channel\}_click`/);
  // The live auth module must exist and stay a state hook, so the negative
  // assertion below cannot pass just because the file was renamed or emptied.
  assert.match(liveAuthState, /export function useAuthSessionState/);
  assert.doesNotMatch(liveAuthState, /events\.registered/);
  // Email/password sign_up is emitted exactly once, by the registration fetch
  // interceptor in metaCapiBridge.js. App.jsx may only emit the OAuth, phone and
  // Telegram channels, never a second email conversion. The matcher lives in
  // scripts/funnel-emitter-contract.mjs and is shared with the shell gate, so
  // quote style and whitespace cannot let a duplicate escape it.
  assert.deepEqual(
    findEmailRegistrationEmitters(app),
    [],
    'App.jsx must not emit a duplicate email registration event',
  );
  assert.ok(
    countRegistrationEmitters(app) >= 3,
    'the OAuth, phone and Telegram registration emitters must still be present in App.jsx',
  );
  assert.match(bridge, /if \(!response\.ok\)/);
  assert.match(bridge, /if \(isPostAd && !payload\.listing_id\) return;/);
  assert.match(openAiBridge, /if \(!content\) return;/);
  assert.match(tiktok, /analyticsEvent === 'listing_published'.*analyticsEvent === 'ad_posted'/s);
  assert.match(tiktok, /!cleanString\(item\.listing_id \|\| item\.ad_id \|\| item\.content_id, 180\)\) return;/);
});

test('internal chat emits canonical message events without message content or user IDs', () => {
  const chat = read('src/components/screens/ChatScreen.jsx');
  assert.match(chat, /import \{ events \} from '\.\.\/\.\.\/utils\/analytics'/);
  assert.match(chat, /events\.messageStarted\(analyticsContext\)/);
  assert.match(chat, /events\.messageSent\(analyticsContext\)/);
  const contextStart = chat.indexOf('const analyticsContext = {');
  const contextEnd = chat.indexOf('\n      };', contextStart);
  const context = chat.slice(contextStart, contextEnd);
  for (const key of ['listing_id', 'ad_id', 'source']) assert.match(context, new RegExp(key));
  for (const blocked of ['content', 'receiver_id', 'sender_id', 'user_id', 'conversation_id']) assert.doesNotMatch(context, new RegExp(blocked));
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

test('homepage analytics uses the active pipeline and excludes catalog/detail states', () => {
  const analytics = read('src/utils/analytics.js');
  const app = read('src/App.jsx');

  assert.match(analytics, /homepageViewed: \(params = \{\}\) =>/);
  assert.match(analytics, /trackEvent\('homepage_viewed', params\)/);
  assert.match(app, /events\.homepageViewed\(\{ source: 'route' \}\)/);
  for (const key of ['search', 'category', 'subcategory', 'page', 'ad', 'store']) {
    assert.match(app, new RegExp(`['"]${key}['"]`));
  }
  assert.match(app, /\^#\(\?:ad-\|company-\)/);
});

test('email-emitter matcher sees every equivalent spelling and nothing else', () => {
  // Positive cases: all semantically identical, all must be caught. The first
  // version of this guard matched only the first of them, which is the defect
  // this test now prevents from coming back.
  const duplicates = [
    "events.registered({ method: 'email' })",
    'events.registered({ method: "email" })',
    'events.registered({ method: `email` })',
    'events.registered({method:"email"})',
    "events.registered ( { method : 'email' } )",
    "events.registered({\n  method:\n    'email',\n})",
    'events.registered({ "method": "email" })',
    "events.registered({ method: 'EMAIL' })",
    'events.registered({ event_id: x, meta_event_id: x, method: "email", source: "y" })',
  ];
  for (const snippet of duplicates) {
    assert.equal(
      findEmailRegistrationEmitters(snippet).length,
      1,
      `must be detected as a duplicate email emitter: ${snippet}`,
    );
  }

  // Negative cases: other channels and lookalike keys must never be flagged, so
  // the guard cannot start failing legitimate code.
  const legitimate = [
    "events.registered({ method: oauthRegistrationMethod })",
    "events.registered({ method: result.registration_method || 'phone' })",
    "events.registered({ method: data.registration_method || 'telegram' })",
    "events.registered({ method: 'google' })",
    "events.contactOpened('whatsapp', ad.id, ad.category, { contact_method: 'email' })",
    "events.registered({ provider: 'email' })",
    "config.method = 'email'",
    "someMethod({ methodology: 'email' })",
    "events.messageStarted({ channel: 'email' })",
  ];
  for (const snippet of legitimate) {
    assert.deepEqual(
      findEmailRegistrationEmitters(snippet),
      [],
      `must NOT be flagged: ${snippet}`,
    );
  }

  // Structural boundary: a following statement's `method: 'email'` must not be
  // attributed to a registration call.
  assert.deepEqual(
    findEmailRegistrationEmitters("events.registered({ method: 'telegram' });\nconst x = { method: 'email' };"),
    [],
    'the matcher must not bleed past the end of the call',
  );
  assert.equal(countRegistrationEmitters("events.registered({ a: 1 })"), 1);
  assert.equal(countRegistrationEmitters("events.registered ( { a: 1 } )"), 1);
});
