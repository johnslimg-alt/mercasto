import { registrationEventId } from './funnelAnalytics.js';

export const LEGAL_DOCUMENT_VERSIONS = Object.freeze({
  terms: '2026-08-03',
  privacy: '2026-08-03',
});

const CONSENT_SOURCES = new Set(['web', 'mobile', 'api']);

export function createRegistrationConsentPayload(
  source = 'web',
  acceptedAt = new Date(),
  { includeEventId = false, eventId = '' } = {},
) {
  const normalizedSource = CONSENT_SOURCES.has(source) ? source : 'web';
  const instant = acceptedAt instanceof Date ? acceptedAt : new Date(acceptedAt);

  if (Number.isNaN(instant.getTime())) {
    throw new TypeError('acceptedAt must be a valid date');
  }

  const resolvedEventId = eventId || (includeEventId ? registrationEventId() : '');
  return {
    age_confirmed: true,
    terms_version: LEGAL_DOCUMENT_VERSIONS.terms,
    privacy_version: LEGAL_DOCUMENT_VERSIONS.privacy,
    consent_accepted_at: instant.toISOString(),
    consent_source: normalizedSource,
    ...(resolvedEventId ? { meta_event_id: resolvedEventId } : {}),
  };
}

export function authTokenFromResponse(data) {
  const token = data?.access_token ?? data?.token;
  return typeof token === 'string' && token.trim() ? token : null;
}

export function createOAuthRegistrationUrl(
  apiBaseUrl,
  provider,
  registrationPayload = null,
) {
  const base = String(apiBaseUrl || '').replace(/\/$/, '');
  const url = new URL(`${base}/auth/${encodeURIComponent(provider)}/redirect`);
  if (registrationPayload) {
    url.searchParams.set('registration', '1');
    Object.entries(registrationPayload).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}
