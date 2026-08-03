import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LEGAL_DOCUMENT_VERSIONS,
  authTokenFromResponse,
  createRegistrationConsentPayload,
} from '../src/utils/registrationConsent.js';

test('registration consent payload is versioned and UTC stamped', () => {
  const payload = createRegistrationConsentPayload(
    'mobile',
    new Date('2026-08-03T21:30:00Z'),
  );

  assert.deepEqual(payload, {
    age_confirmed: true,
    terms_version: LEGAL_DOCUMENT_VERSIONS.terms,
    privacy_version: LEGAL_DOCUMENT_VERSIONS.privacy,
    consent_accepted_at: '2026-08-03T21:30:00.000Z',
    consent_source: 'mobile',
  });
});

test('auth token normalization accepts Laravel and legacy responses', () => {
  assert.equal(authTokenFromResponse({ access_token: 'laravel' }), 'laravel');
  assert.equal(authTokenFromResponse({ token: 'legacy' }), 'legacy');
  assert.equal(authTokenFromResponse({}), null);
});
