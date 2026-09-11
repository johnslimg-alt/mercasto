import { getCampaignAttribution } from './campaignAttribution.js';

/**
 * Attribution fields persisted onto the user at registration.
 *
 * These names are the contract with the backend (`registration_attribution`
 * validation in AuthController and the `user_registration_attributions` table),
 * so they must stay stable: CAC, cost per registration and cost per activated
 * seller are all joined on `attribution_campaign` / `first_touch_campaign`.
 */
export const REGISTRATION_ATTRIBUTION_STRING_FIELDS = Object.freeze([
  'attribution_source',
  'attribution_medium',
  'attribution_campaign',
  'attribution_content',
  'attribution_term',
  'attribution_click_platform',
  'attribution_channel',
  'attribution_referrer_host',
  'attribution_landing_path',
  'first_touch_source',
  'first_touch_medium',
  'first_touch_campaign',
  'first_touch_content',
  'first_touch_term',
  'first_touch_landing_path',
]);

export const REGISTRATION_ATTRIBUTION_BOOLEAN_FIELDS = Object.freeze([
  'attribution_paid',
  'attribution_ai_referral',
  'first_touch_paid',
]);

/** Presence of any of these marks the registration as campaign-attributed. */
const PRESENCE_FIELDS = Object.freeze([
  'attribution_source',
  'attribution_medium',
  'attribution_campaign',
  'attribution_content',
  'attribution_term',
  'attribution_click_platform',
  'attribution_channel',
  'attribution_referrer_host',
  'attribution_landing_path',
  'first_touch_source',
  'first_touch_medium',
  'first_touch_campaign',
  'first_touch_content',
  'first_touch_term',
  'first_touch_landing_path',
]);

const MAX_FIELD_LENGTH = 180;
const MAX_PATH_LENGTH = 300;

function clean(value, maxLength = MAX_FIELD_LENGTH) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

/**
 * Builds the attribution slice of a registration payload.
 *
 * Returns `{}` when no attribution touch exists, so an organic or direct
 * registration is stored as unknown rather than as an empty campaign, and the
 * OAuth redirect URL stays short. Booleans are included whenever a touch
 * exists, because `attribution_paid: false` (organic with a known touch) is a
 * different fact from "no attribution at all".
 *
 * @param {() => object} reader attribution reader, injectable for tests
 * @returns {Record<string, string|boolean>}
 */
export function registrationAttributionPayload(reader = getCampaignAttribution) {
  let raw = {};
  try {
    raw = (typeof reader === 'function' ? reader() : null) || {};
  } catch {
    return {};
  }

  const hasAttribution = PRESENCE_FIELDS.some((field) => clean(raw[field]) !== '');
  if (!hasAttribution) return {};

  const payload = {};
  REGISTRATION_ATTRIBUTION_STRING_FIELDS.forEach((field) => {
    const maxLength = field.endsWith('landing_path') ? MAX_PATH_LENGTH : MAX_FIELD_LENGTH;
    const value = clean(raw[field], maxLength);
    if (value) payload[field] = value;
  });
  REGISTRATION_ATTRIBUTION_BOOLEAN_FIELDS.forEach((field) => {
    payload[field] = raw[field] === true;
  });

  const capturedAt = Number(raw.attribution_captured_at ?? raw.capturedAt);
  if (Number.isFinite(capturedAt) && capturedAt > 0) {
    payload.attribution_captured_at = new Date(capturedAt).toISOString();
  }

  return payload;
}
