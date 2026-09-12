import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isAdCreditPromotionEligible,
  isPausedAdBulkActivatable,
  isReviewReadyForBulkReactivation,
  isSellerConfirmationPending,
} from '../src/utils/adBulkEligibility.js';

const NOW = Date.parse('2026-09-09T02:00:00Z');
const future = '2026-09-10T02:00:00Z';
const past = '2026-09-08T02:00:00Z';
const complete = {
  price: 1500,
  condition: 'usado',
  location: 'Veracruz',
  state: 'Veracruz',
  city: 'Veracruz',
  is_catalog_filler: false,
};

test('paused bulk activation requires a live expiry', () => {
  assert.equal(isPausedAdBulkActivatable({ status: 'paused', expires_at: future }, NOW), true);
  assert.equal(isPausedAdBulkActivatable({ status: 'paused', expires_at: past }, NOW), false);
  assert.equal(isPausedAdBulkActivatable({ status: 'archived', expires_at: future }, NOW), false);
});

test('review-ready bulk reactivation requires a current seller-confirmation window and complete details', () => {
  const ready = {
    ...complete,
    status: 'archived',
    ai_moderation_status: 'approved',
    expires_at: null,
    ai_moderated_at: '2026-09-09T01:00:00Z',
    republished_at: null,
  };
  assert.equal(isSellerConfirmationPending(ready), true);
  // The backend now persists a granted-but-hidden approval as 'reactivation_pending'.
  assert.equal(isSellerConfirmationPending({ ...ready, ai_moderation_status: 'reactivation_pending' }), true);
  assert.equal(isReviewReadyForBulkReactivation(ready), true);
  assert.equal(isReviewReadyForBulkReactivation({ ...ready, city: '' }), false);
  assert.equal(isSellerConfirmationPending({ ...ready, expires_at: future }), false);
  assert.equal(isSellerConfirmationPending({ ...ready, republished_at: '2026-09-09T01:30:00Z' }), false);
  assert.equal(isSellerConfirmationPending({ ...ready, ai_moderation_status: 'manual_review' }), false);
  assert.equal(isSellerConfirmationPending({ ...ready, is_catalog_filler: true }), false);
  assert.equal(isSellerConfirmationPending({ ...ready, seller_confirmation_pending: false }), false);
  assert.equal(isReviewReadyForBulkReactivation({ ...ready, seller_confirmation_pending: false }), false);
});

test('credit promotion is limited to visible live ads without an active promotion', () => {
  const active = { ...complete, status: 'active', expires_at: future };
  assert.equal(isAdCreditPromotionEligible(active, NOW), true);
  assert.equal(isAdCreditPromotionEligible({ ...active, status: 'archived' }, NOW), false);
  assert.equal(isAdCreditPromotionEligible({ ...active, expires_at: past }, NOW), false);
  assert.equal(isAdCreditPromotionEligible({ ...active, boost_expires_at: future }, NOW), false);
  assert.equal(isAdCreditPromotionEligible({ ...active, promoted: 'destacado', boost_expires_at: null }, NOW), false);
});
