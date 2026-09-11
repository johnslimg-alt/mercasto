import { isCatalogReference } from './catalogInventory.js';

export function hasCompleteReactivationDetails(ad) {
  const price = Number(ad?.price);
  return Number.isFinite(price)
    && price >= 0
    && price <= 9999999999.99
    && ['nuevo', 'usado', 'new', 'used'].includes(String(ad?.condition || ''))
    && Boolean(String(ad?.location || '').trim())
    && Boolean(String(ad?.state || '').trim())
    && Boolean(String(ad?.city || '').trim());
}

export function isPausedAdBulkActivatable(ad, nowMs = Date.now()) {
  return ad?.status === 'paused'
    && Boolean(ad?.expires_at)
    && new Date(ad.expires_at).getTime() > nowMs;
}

// Mirrors Ad::MODERATION_APPROVED / Ad::MODERATION_REACTIVATION_PENDING on the
// backend: 'approved' is reserved for publicly visible ads, while an approval
// that must wait for the seller to confirm availability is stored as
// 'reactivation_pending'. Both are accepted here because this is only the
// fallback used when the API does not send the authoritative
// `seller_confirmation_pending` boolean (see Ad::isSellerConfirmationReactivationEligible()).
const SELLER_CONFIRMATION_STATUSES = new Set(['approved', 'reactivation_pending']);

export function isSellerConfirmationPending(ad) {
  if (typeof ad?.seller_confirmation_pending === 'boolean') return ad.seller_confirmation_pending;
  const moderatedAt = ad?.ai_moderated_at ? new Date(ad.ai_moderated_at).getTime() : null;
  const republishedAt = ad?.republished_at ? new Date(ad.republished_at).getTime() : null;
  return ad?.status === 'archived'
    && SELLER_CONFIRMATION_STATUSES.has(ad?.ai_moderation_status)
    && !isCatalogReference(ad)
    && !ad?.expires_at
    && (!republishedAt || (Number.isFinite(moderatedAt) && moderatedAt > republishedAt));
}

export function isReviewReadyForBulkReactivation(ad) {
  return isSellerConfirmationPending(ad)
    && hasCompleteReactivationDetails(ad);
}

export function isAdCreditPromotionEligible(ad, nowMs = Date.now()) {
  const hasActivePromotion = (ad?.boost_expires_at && new Date(ad.boost_expires_at).getTime() > nowMs)
    || (ad?.promoted === 'destacado' && !ad?.boost_expires_at);
  return ad?.status === 'active'
    && !isCatalogReference(ad)
    && Boolean(ad?.expires_at)
    && new Date(ad.expires_at).getTime() > nowMs
    && !hasActivePromotion;
}
