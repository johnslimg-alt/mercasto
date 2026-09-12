#!/usr/bin/env node
// Executes the real registration-consent contract of the frontend module that
// builds the /api/register and OAuth-registration payloads.
//
// scripts/registration-consent-contract-gate.sh used to describe this contract
// with `grep -qF` assertions over source text, which prove only that a string is
// typed somewhere. This probe imports src/utils/registrationConsent.js and
// asserts what the product actually produces, so deleting a consent field from
// the payload fails the gate instead of leaving it green.
//
// The backend-accepted document versions are not hardcoded here: the gate reads
// them out of backend/config/legal.php and passes them in, so a version bump on
// one side of the contract fails the gate on the other side.

import assert from 'node:assert/strict';
import {
  LEGAL_DOCUMENT_VERSIONS,
  createOAuthRegistrationUrl,
  createRegistrationConsentPayload,
} from '../src/utils/registrationConsent.js';

const termsVersion = process.env.CONSENT_BACKEND_TERMS_VERSION;
const privacyVersion = process.env.CONSENT_BACKEND_PRIVACY_VERSION;

assert.ok(
  termsVersion && privacyVersion,
  'gate must pass the backend-accepted legal versions (CONSENT_BACKEND_TERMS_VERSION / CONSENT_BACKEND_PRIVACY_VERSION)',
);

const acceptedAt = new Date('2026-08-03T21:30:00Z');
const payload = createRegistrationConsentPayload('mobile', acceptedAt);

// Every consent fact the backend records in user_consents must survive payload
// construction. Each of these is a database column the registration path writes.
const requiredFields = [
  'age_confirmed',
  'terms_version',
  'privacy_version',
  'consent_accepted_at',
  'consent_source',
];
for (const field of requiredFields) {
  assert.ok(
    Object.hasOwn(payload, field),
    `registration consent payload dropped the "${field}" field`,
  );
}

assert.equal(payload.age_confirmed, true, 'age confirmation must be an explicit true');
assert.equal(payload.consent_source, 'mobile', 'consent source must be preserved');
assert.equal(
  payload.consent_accepted_at,
  '2026-08-03T21:30:00.000Z',
  'consent timestamp must be serialized as a canonical ISO instant',
);

// The frontend and the backend must agree on the accepted document versions.
assert.equal(
  payload.terms_version,
  termsVersion,
  `frontend terms version ${payload.terms_version} does not match the backend-accepted ${termsVersion}`,
);
assert.equal(
  payload.privacy_version,
  privacyVersion,
  `frontend privacy version ${payload.privacy_version} does not match the backend-accepted ${privacyVersion}`,
);
assert.equal(LEGAL_DOCUMENT_VERSIONS.terms, termsVersion);
assert.equal(LEGAL_DOCUMENT_VERSIONS.privacy, privacyVersion);

// A web visitor without an affirmative tracking answer must never be reported as
// consenting to measurement vendors. The backend treats a missing flag as false,
// so the mobile payload is checked for the same fail-closed outcome below.
const webPayload = createRegistrationConsentPayload('web', acceptedAt);
assert.equal(
  webPayload.openai_measurement_consent,
  false,
  'measurement consent must default to false until the visitor accepts',
);
if (Object.hasOwn(payload, 'openai_measurement_consent')) {
  assert.equal(payload.openai_measurement_consent, false);
}

// The OAuth registration hand-off carries consent through the redirect URL, so
// the backend can rebuild the same payload from its one-time registration state.
const oauthUrl = new URL(createOAuthRegistrationUrl('https://mercasto.com/api/', 'google', payload));
const oauthParam = (name) => oauthUrl.searchParams.get(name);
const oauthFailure = (name) =>
  `OAuth registration hand-off lost the "${name}" parameter, so the backend cannot rebuild the consent payload`;
assert.equal(oauthParam('registration'), '1', 'OAuth registration hand-off must mark the redirect as a registration');
assert.equal(oauthParam('age_confirmed'), 'true', oauthFailure('age_confirmed'));
assert.equal(oauthParam('terms_version'), termsVersion, oauthFailure('terms_version'));
assert.equal(oauthParam('privacy_version'), privacyVersion, oauthFailure('privacy_version'));
assert.equal(oauthParam('consent_accepted_at'), payload.consent_accepted_at, oauthFailure('consent_accepted_at'));
assert.equal(oauthParam('consent_source'), 'mobile', oauthFailure('consent_source'));

// A malformed client timestamp must be rejected before it can reach the API.
assert.throws(
  () => createRegistrationConsentPayload('web', 'not-a-date'),
  TypeError,
  'an invalid consent timestamp must throw instead of being sent to the API',
);

console.log('registration consent frontend contract OK');
