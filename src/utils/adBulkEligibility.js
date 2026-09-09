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

export function isReviewReadyForBulkReactivation(ad) {
  return ad?.status === 'archived'
    && ad?.ai_moderation_status === 'approved'
    && !ad?.is_catalog_filler
    && hasCompleteReactivationDetails(ad);
}

export function isAdCreditPromotionEligible(ad, nowMs = Date.now()) {
  return ad?.status === 'active'
    && !ad?.is_catalog_filler
    && Boolean(ad?.expires_at)
    && new Date(ad.expires_at).getTime() > nowMs
    && !(ad?.boost_expires_at && new Date(ad.boost_expires_at).getTime() > nowMs);
}
