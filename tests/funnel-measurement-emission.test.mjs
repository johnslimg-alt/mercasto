import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  REGISTRATION_ENDPOINT_PATH,
  buildRegistrationEventPayload,
  createRegistrationFetchHandler,
  createRegistrationSingleFire,
  isRegistrationRequest,
} from '../src/utils/registrationMeasurement.js';
import {
  REGISTRATION_ATTRIBUTION_BOOLEAN_FIELDS,
  REGISTRATION_ATTRIBUTION_STRING_FIELDS,
  registrationAttributionPayload,
} from '../src/utils/registrationAttribution.js';
import { CONTACT_BUTTON_SOURCE, emitContactIntent, logContactIntent } from '../src/utils/contactIntent.js';

const ORIGIN = 'https://mercasto.com';
const API_BASE = 'https://mercasto.com/api';
const ATTRIBUTION = {
  attribution_source: 'facebook',
  attribution_medium: 'paid_social',
  attribution_campaign: 'verano_2026',
  attribution_content: 'carrusel_a',
  attribution_term: 'autos-usados',
  attribution_click_platform: 'meta',
  attribution_channel: 'paid_social',
  attribution_referrer_host: 'facebook.com',
  attribution_landing_path: '/autos?utm_source=facebook&utm_campaign=verano_2026',
  attribution_paid: true,
  attribution_ai_referral: false,
  attribution_captured_at: Date.UTC(2026, 8, 12, 10, 0, 0),
  first_touch_source: 'google',
  first_touch_medium: 'cpc',
  first_touch_campaign: 'marca_2026',
  first_touch_content: 'texto_a',
  first_touch_term: 'autos',
  first_touch_landing_path: '/',
  first_touch_paid: true,
};

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    clone: () => ({ json: async () => body }),
  };
}

function registerRequest(body, overrides = {}) {
  return {
    input: `${ORIGIN}${REGISTRATION_ENDPOINT_PATH}`,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...overrides,
    },
  };
}

/** Builds a handler with a recording emitter and a controllable fetch. */
function harness({ responses = [], attribution = {}, userId = '' } = {}) {
  const emitted = [];
  const calls = [];
  let index = 0;

  const handler = createRegistrationFetchHandler({
    fetchImpl: async (input, init) => {
      calls.push({ input, init });
      const next = responses[index] ?? responses[responses.length - 1] ?? jsonResponse({ user: { id: 7 } });
      index += 1;
      return next;
    },
    emit: (payload) => emitted.push(payload),
    getAttribution: () => attribution,
    getUserId: () => userId,
    origin: ORIGIN,
    apiBaseUrl: API_BASE,
  });

  return { handler, emitted, calls };
}

test('(a) a successful email/password registration emits the registration event exactly once', async () => {
  const { handler, emitted, calls } = harness({
    responses: [jsonResponse({ user: { id: 4242 } }, { status: 201 })],
    attribution: ATTRIBUTION,
  });

  const response = await handler(...Object.values(registerRequest({
    name: 'Seller',
    email: 'seller@example.com',
    meta_event_id: 'register_user_abc123',
  })));

  assert.equal(response.ok, true);
  assert.equal(calls.length, 1, 'the registration POST must still reach the network exactly once');
  assert.equal(emitted.length, 1, 'exactly one registration event per successful registration');

  const [payload] = emitted;
  assert.equal(payload.method, 'email', 'email must be distinguishable from oauth/phone/telegram');
  assert.equal(payload.provider, 'password');
  assert.equal(payload.event_id, 'register_user_abc123');
  assert.equal(payload.meta_event_id, 'register_user_abc123', 'browser and server copies must share the id');
  assert.equal(payload.user_id, '4242', 'the account id is attached for GA4 stitching');
  assert.equal(payload.source, 'registration_fetch');
});

test('(b) a failed registration emits nothing', async () => {
  const { handler, emitted } = harness({
    responses: [jsonResponse({ message: 'Este correo ya está registrado.' }, { ok: false, status: 422 })],
    attribution: ATTRIBUTION,
  });

  const response = await handler(...Object.values(registerRequest({ email: 'taken@example.com' })));

  assert.equal(response.ok, false);
  assert.equal(emitted.length, 0, 'a rejected registration is not a conversion');
});

test('(c) login emits none, and only the registration endpoint is intercepted', async () => {
  const login = harness({ responses: [jsonResponse({ access_token: 'x' })] });
  await login.handler(`${ORIGIN}/api/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'seller@example.com', password: 'secret' }),
  });
  assert.equal(login.emitted.length, 0, 'login must never emit a registration event');

  const thirdParty = harness({ responses: [jsonResponse({ user: { id: 1 } })] });
  await thirdParty.handler('https://evil.example.com/api/register', {
    method: 'POST',
    body: JSON.stringify({ email: 'seller@example.com' }),
  });
  assert.equal(thirdParty.emitted.length, 0, 'a third-party origin must never be counted');

  const get = harness({ responses: [jsonResponse({})] });
  await get.handler(`${ORIGIN}${REGISTRATION_ENDPOINT_PATH}`, { method: 'GET' });
  assert.equal(get.emitted.length, 0);
});

test('(c2) a retried or replayed successful registration is not double counted', async () => {
  const { handler, emitted } = harness({
    responses: [jsonResponse({ user: { id: 9 } }), jsonResponse({ user: { id: 9 } })],
  });

  const body = { email: 'retry@example.com', meta_event_id: 'register_user_retry1' };
  await handler(...Object.values(registerRequest(body)));
  await handler(...Object.values(registerRequest(body)));

  assert.equal(emitted.length, 1, 'the same registration event id must only ever be emitted once');
});

test('(d) attribution fields are included when present and omitted cleanly when absent', () => {
  const present = registrationAttributionPayload(() => ATTRIBUTION);

  REGISTRATION_ATTRIBUTION_STRING_FIELDS.forEach((field) => {
    if (typeof ATTRIBUTION[field] === 'string' && ATTRIBUTION[field] !== '') {
      assert.equal(present[field], ATTRIBUTION[field], `${field} must travel with the registration`);
    }
  });
  REGISTRATION_ATTRIBUTION_BOOLEAN_FIELDS.forEach((field) => {
    if (field in ATTRIBUTION) assert.equal(present[field], ATTRIBUTION[field]);
  });
  assert.equal(present.attribution_campaign, 'verano_2026');
  assert.equal(present.first_touch_campaign, 'marca_2026');
  assert.equal(present.attribution_captured_at, new Date(ATTRIBUTION.attribution_captured_at).toISOString());

  // Absent attribution must not fabricate an empty campaign.
  assert.deepEqual(registrationAttributionPayload(() => ({})), {});
  assert.deepEqual(registrationAttributionPayload(() => {
    throw new Error('storage unavailable');
  }), {});
  assert.deepEqual(registrationAttributionPayload(() => ({
    attribution_source: '',
    attribution_medium: '   ',
    attribution_campaign: '',
    attribution_paid: false,
    first_touch_source: '',
    first_touch_campaign: '',
  })), {}, 'all-empty attribution is omitted instead of stored as an empty campaign');

  // Organic traffic with a known touch is recorded as organic, not unknown.
  const organic = registrationAttributionPayload(() => ({
    attribution_source: 'google',
    attribution_medium: 'organic',
    attribution_paid: false,
    first_touch_paid: false,
  }));
  assert.equal(organic.attribution_source, 'google');
  assert.equal(organic.attribution_paid, false);
});

test('(d2) attribution is carried into the event payload without leaking empty values', () => {
  const payload = buildRegistrationEventPayload({
    eventId: 'register_user_attr1',
    method: 'email',
    provider: 'password',
    userId: 77,
    attribution: registrationAttributionPayload(() => ATTRIBUTION),
  });

  assert.equal(payload.attribution_campaign, 'verano_2026');
  assert.equal(payload.first_touch_campaign, 'marca_2026');
  assert.equal(payload.user_id, '77');

  const bare = buildRegistrationEventPayload({ eventId: 'register_user_bare1' });
  assert.equal(bare.attribution_campaign, undefined);
  assert.equal(bare.first_touch_campaign, undefined);
  assert.equal('attribution_source' in bare, false);
  assert.equal(bare.method, 'email');
});

test('(e) contact_opened fires before the contact POST', async () => {
  const order = [];
  const analytics = {
    contactOpened: (channel, listingId, category, params) => {
      order.push('emit');
      assert.equal(channel, 'whatsapp');
      assert.equal(listingId, 555);
      assert.equal(category, 'autos');
      assert.equal(params.source, CONTACT_BUTTON_SOURCE);
      assert.equal(params.contact_method, 'whatsapp');
    },
  };

  const result = await logContactIntent({
    channel: 'whatsapp',
    ad: { id: 555, category: 'autos' },
    analytics,
    post: async () => {
      order.push('post');
      return true;
    },
  });

  assert.deepEqual(order, ['emit', 'post'], 'contact_opened must be emitted before the POST');
  assert.equal(result, true);

  // A POST failure must not undo or reorder the measurement.
  const failureOrder = [];
  const failed = await logContactIntent({
    channel: 'telegram',
    ad: { id: 556, category: 'autos' },
    analytics: { contactOpened: () => failureOrder.push('emit') },
    post: async () => {
      failureOrder.push('post');
      throw new Error('network down');
    },
  });
  assert.deepEqual(failureOrder, ['emit', 'post']);
  assert.equal(failed, false);

  // Analytics errors must never block the contact action itself.
  const blockedOrder = [];
  await logContactIntent({
    channel: 'telegram',
    ad: { id: 557 },
    analytics: {
      contactOpened: () => {
        throw new Error('analytics unavailable');
      },
    },
    post: async () => blockedOrder.push('post'),
  });
  assert.deepEqual(blockedOrder, ['post'], 'contact must still work when analytics throws');

  assert.equal(emitContactIntent({ channel: '', ad: { id: 1 }, analytics }), false);
  assert.equal(emitContactIntent({ channel: 'whatsapp', ad: {}, analytics }), false);
});

test('the interception contract is wired into the shipped bridge and the contact button', () => {
  const bridge = fs.readFileSync('src/utils/metaCapiBridge.js', 'utf8');
  const app = fs.readFileSync('src/App.jsx', 'utf8');
  const button = fs.readFileSync('src/components/common/ContactButton.jsx', 'utf8');
  const profileEdit = fs.readFileSync('src/components/screens/ProfileEditScreen.jsx', 'utf8');
  const analytics = fs.readFileSync('src/utils/analytics.js', 'utf8');

  assert.match(bridge, /createRegistrationFetchHandler\(/);
  assert.match(bridge, /REGISTRATION_METHOD_EMAIL/);
  assert.match(bridge, /getAttribution: getCampaignAttribution/);

  // Exactly one emitter for the email/password path: App.jsx must not add a second one.
  assert.doesNotMatch(app, /events\.registered\(\{[\s\S]{0,200}?method: 'email'/);
  assert.match(app, /registrationAttributionPayload\(\)/);
  assert.match(app, /setAnalyticsUser\(result\.user\)/);

  assert.match(button, /logContactIntent\(/);
  assert.match(button, /CONTACT_BUTTON_SOURCE/);
  assert.match(profileEdit, /events\.phoneVerified\(/);
  assert.match(analytics, /export function setAnalyticsUser/);
  assert.match(analytics, /export function getAnalyticsUserId/);
});

test('single-fire guard keeps distinct registrations distinct', () => {
  const guard = createRegistrationSingleFire();
  assert.equal(guard.claim('register_user_a'), true);
  assert.equal(guard.claim('register_user_a'), false);
  assert.equal(guard.claim('register_user_b'), true);
  assert.equal(guard.claim(''), false);
  assert.equal(guard.size(), 2);
  guard.reset();
  assert.equal(guard.claim('register_user_a'), true);
});

test('registration endpoint matching accepts the configured API base and rejects lookalikes', () => {
  const post = { method: 'POST' };

  assert.equal(isRegistrationRequest(`${ORIGIN}/api/register`, post, { origin: ORIGIN, apiBaseUrl: API_BASE }), true);
  assert.equal(
    isRegistrationRequest('https://api.mercasto.com/api/register', post, { origin: ORIGIN, apiBaseUrl: 'https://api.mercasto.com/api' }),
    true,
    'a cross-origin configured API base must still be measured',
  );
  assert.equal(
    isRegistrationRequest('https://api.mercasto.com/api/register', post, { origin: ORIGIN, apiBaseUrl: API_BASE }),
    false,
    'an unconfigured origin must never be measured',
  );
  assert.equal(isRegistrationRequest(`${ORIGIN}/api/register/extra`, post, { origin: ORIGIN, apiBaseUrl: API_BASE }), false);
  assert.equal(isRegistrationRequest(`${ORIGIN}/api/register`, { method: 'PUT' }, { origin: ORIGIN, apiBaseUrl: API_BASE }), false);
});

test('measurement consent is resolved per request, not frozen when the interceptor installs', async () => {
  const bodies = [];
  let allowed = false;

  const handler = createRegistrationFetchHandler({
    fetchImpl: async (input, init) => {
      bodies.push(JSON.parse(init.body));
      return jsonResponse({ user: { id: 11 } });
    },
    emit: () => {},
    getAttribution: () => ({}),
    origin: ORIGIN,
    apiBaseUrl: API_BASE,
    consent: () => allowed,
  });

  const request = () => registerRequest({ email: 'consent@example.com', meta_event_id: `register_user_c${bodies.length}` });

  await handler(...Object.values(request()));
  allowed = true;
  await handler(...Object.values(request()));

  assert.equal(bodies[0].openai_measurement_consent, false, 'consent granted later must not be retroactive');
  assert.equal(bodies[1].openai_measurement_consent, true, 'consent must be re-read on each registration request');
});

test('the id attached to the registration request is the same id emitted as the conversion', async () => {
  const { handler, emitted, calls } = harness({
    responses: [jsonResponse({ user: { id: 31 } }, { status: 201 })],
    attribution: ATTRIBUTION,
  });

  await handler(...Object.values(registerRequest({ email: 'same-id@example.com' })));

  const sentBody = JSON.parse(calls[0].init.body);
  assert.match(sentBody.meta_event_id, /^register_user_[A-Za-z0-9._:-]+$/);
  assert.ok(sentBody.meta_event_id.length <= 120, 'backend observer allowlist caps the id at 120 chars');
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].event_id, sentBody.meta_event_id, 'browser and server copies must share one id');
  assert.equal(emitted[0].meta_event_id, sentBody.meta_event_id);
});

test('the conversion is emitted only after a successful response, never before it settles', async () => {
  const order = [];
  let release;
  const gate = new Promise((resolve) => { release = resolve; });

  const handler = createRegistrationFetchHandler({
    fetchImpl: async () => {
      order.push('request');
      await gate;
      order.push('response');
      return jsonResponse({ user: { id: 5 } }, { status: 201 });
    },
    emit: () => order.push('emit'),
    getAttribution: () => ({}),
    origin: ORIGIN,
    apiBaseUrl: API_BASE,
  });

  const pending = handler(...Object.values(registerRequest({ email: 'ordered@example.com' })));
  await Promise.resolve();
  assert.deepEqual(order, ['request'], 'nothing may be emitted while the registration is still in flight');

  release();
  await pending;
  assert.deepEqual(order, ['request', 'response', 'emit']);
});
