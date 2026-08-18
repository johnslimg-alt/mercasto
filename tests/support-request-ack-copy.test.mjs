import test from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import {
  getSupportRequestAcknowledgementCopy,
  getSupportRequestStatusLabel,
  SUPPORT_ACK_LANGUAGES,
} from '../src/utils/supportRequestAcknowledgementCopy.js';

test('support acknowledgement copy covers every active language exactly once', () => {
  assert.deepEqual([...SUPPORT_ACK_LANGUAGES].sort(), [...SUPPORTED_LANGUAGES].sort());

  for (const lang of SUPPORTED_LANGUAGES) {
    const copy = getSupportRequestAcknowledgementCopy(lang);
    assert.ok(copy.referenceLabel.trim(), `${lang}: referenceLabel`);
    assert.ok(copy.statusLabel.trim(), `${lang}: statusLabel`);
    assert.ok(copy.followUp.trim(), `${lang}: followUp`);
    for (const status of ['received', 'in_review', 'waiting_user', 'resolved']) {
      assert.ok(copy.statuses[status]?.trim(), `${lang}: ${status}`);
    }
  }
});

test('unknown public status falls back to localized received label', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    assert.equal(
      getSupportRequestStatusLabel(lang, 'internal_only_status'),
      getSupportRequestAcknowledgementCopy(lang).statuses.received,
    );
  }
});

test('archived language codes keep the existing Spanish fallback contract', () => {
  assert.equal(getSupportRequestAcknowledgementCopy('he').referenceLabel, getSupportRequestAcknowledgementCopy('es').referenceLabel);
  assert.equal(getSupportRequestAcknowledgementCopy('yi').statusLabel, getSupportRequestAcknowledgementCopy('es').statusLabel);
});
