import { registrationEventId } from './funnelAnalytics.js';

/**
 * Canonical registration endpoints. The same physical endpoint may be addressed
 * as a same-origin path (`/api/register`) or through the configured API base
 * (`https://mercasto.com/api` + `/register`). Both spellings must resolve to the
 * same measurement so a hosting change (apex vs www, api subdomain) cannot
 * silently delete the registration conversion.
 */
export const REGISTRATION_ENDPOINT_PATH = '/api/register';
export const REGISTRATION_METHOD_EMAIL = 'email';
export const REGISTRATION_PROVIDER_PASSWORD = 'password';
export const REGISTRATION_EVENT_SOURCE = 'registration_fetch';

const MAX_SEEN_EVENT_IDS = 50;

function clean(value, maxLength = 180) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function parseApiBase(apiBaseUrl) {
  const raw = clean(apiBaseUrl, 500);
  if (!raw) return null;

  try {
    const url = new URL(raw, 'https://mercasto.com');
    const path = url.pathname.replace(/\/+$/, '');
    return { origin: url.origin, path };
  } catch {
    return null;
  }
}

function requestMethod(input, init = {}) {
  const explicit = init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : '') || 'GET';
  return String(explicit).toUpperCase();
}

function requestUrl(input) {
  if (typeof Request !== 'undefined' && input instanceof Request) return clean(input.url, 2000);
  return clean(input, 2000);
}

/**
 * True only for a POST to this app's own registration endpoint.
 * Third-party origins never match, and a cross-origin API base is accepted only
 * when it is the configured Mercasto API base.
 */
export function isRegistrationRequest(input, init = {}, { origin = '', apiBaseUrl = '' } = {}) {
  if (requestMethod(input, init) !== 'POST') return false;

  const raw = requestUrl(input);
  if (!raw) return false;

  let url;
  try {
    url = new URL(raw, origin || 'https://mercasto.com');
  } catch {
    return false;
  }

  const apiBase = parseApiBase(apiBaseUrl);
  const candidates = [REGISTRATION_ENDPOINT_PATH];
  if (apiBase?.path) candidates.push(`${apiBase.path}/register`);

  if (!candidates.includes(url.pathname)) return false;

  const allowedOrigins = [clean(origin, 300), apiBase?.origin || ''].filter(Boolean);
  return allowedOrigins.includes(url.origin);
}

/**
 * Injects the shared event id so the browser Pixel copy and the server-side
 * CompleteRegistration copy deduplicate against each other. Returns null when
 * the request cannot be safely rewritten (Request instances, non-JSON bodies).
 */
export function registrationRequestWithEventId(input, init = {}, { eventId = '', consent = undefined } = {}) {
  if (typeof Request !== 'undefined' && input instanceof Request) return null;

  let payload;
  try {
    payload = JSON.parse(String(init?.body || '{}'));
  } catch {
    return null;
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const sharedEventId = clean(payload.meta_event_id, 120) || clean(eventId, 120) || registrationEventId();
  const body = {
    ...payload,
    meta_event_id: sharedEventId,
  };
  if (typeof consent === 'boolean') body.openai_measurement_consent = consent;

  return {
    sharedEventId,
    init: { ...init, body: JSON.stringify(body) },
  };
}

/**
 * Builds the registration conversion payload. Every parameter is optional
 * except the event id, and empty attribution values are omitted so an organic
 * registration does not look like a campaign-attributed one.
 */
export function buildRegistrationEventPayload({
  eventId = '',
  method = REGISTRATION_METHOD_EMAIL,
  provider = '',
  userId = '',
  attribution = {},
  source = REGISTRATION_EVENT_SOURCE,
} = {}) {
  const resolvedEventId = clean(eventId, 120) || registrationEventId();
  const payload = {
    event_id: resolvedEventId,
    meta_event_id: resolvedEventId,
  };

  const resolvedMethod = clean(method, 40);
  if (resolvedMethod) payload.method = resolvedMethod;
  const resolvedProvider = clean(provider, 40);
  if (resolvedProvider) payload.provider = resolvedProvider;
  const resolvedUserId = clean(userId, 40);
  if (resolvedUserId) payload.user_id = resolvedUserId;
  const resolvedSource = clean(source, 60);
  if (resolvedSource) payload.source = resolvedSource;

  Object.entries(attribution || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    if (typeof value === 'boolean' && value === false && !key.endsWith('_present')) return;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      payload[key] = value;
    }
  });

  return payload;
}

/**
 * Single-fire guard. A successful registration is emitted at most once per
 * shared event id, which makes a retried request or a replayed dataLayer item
 * idempotent instead of double counted.
 */
export function createRegistrationSingleFire({ maxEntries = MAX_SEEN_EVENT_IDS } = {}) {
  let seen = [];

  return {
    claim(eventId) {
      const id = clean(eventId, 120);
      if (!id) return false;
      if (seen.includes(id)) return false;
      seen.push(id);
      if (seen.length > maxEntries) seen = seen.slice(-maxEntries);
      return true;
    },
    size() {
      return seen.length;
    },
    reset() {
      seen = [];
    },
  };
}

/**
 * Builds the fetch interceptor that emits exactly one registration conversion
 * per successful registration POST. All analytics dependencies are injected so
 * the behaviour can be tested without a browser and so the emitter stays the
 * shared first-party analytics API (which owns consent gating).
 */
export function createRegistrationFetchHandler({
  fetchImpl,
  emit,
  getAttribution = () => ({}),
  getUserId = () => '',
  origin = '',
  apiBaseUrl = '',
  method = REGISTRATION_METHOD_EMAIL,
  provider = REGISTRATION_PROVIDER_PASSWORD,
  source = REGISTRATION_EVENT_SOURCE,
  guard = createRegistrationSingleFire(),
  eventIdFactory = registrationEventId,
  consent = undefined,
  onError = () => {},
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
  if (typeof emit !== 'function') throw new TypeError('emit must be a function');

  return async function registrationFetch(input, init = {}) {
    if (!isRegistrationRequest(input, init, { origin, apiBaseUrl })) {
      return fetchImpl(input, init);
    }

    // Consent can be granted after this interceptor is installed, so a function
    // is resolved per request instead of being frozen at install time.
    const resolvedConsent = typeof consent === 'function' ? Boolean(consent()) : consent;

    const patched = registrationRequestWithEventId(input, init, {
      eventId: eventIdFactory(),
      consent: resolvedConsent,
    });
    if (!patched) return fetchImpl(input, init);

    const response = await fetchImpl(input, patched.init);
    if (!response || response.ok !== true) return response;

    // A retried or replayed registration must never emit twice.
    if (!guard.claim(patched.sharedEventId)) return response;

    let userId = '';
    try {
      if (typeof response.clone === 'function') {
        const data = await response.clone().json();
        userId = data?.user?.id ?? data?.user_id ?? '';
      }
    } catch {
      // The conversion must still be emitted when the body cannot be re-read.
    }

    try {
      emit(buildRegistrationEventPayload({
        eventId: patched.sharedEventId,
        method,
        provider,
        userId: userId || getUserId(),
        attribution: getAttribution() || {},
        source,
      }));
    } catch (error) {
      // Measurement must never block or fail a real registration.
      onError(error);
    }

    return response;
  };
}
