const URL_RE = /(?:https?:\/\/|www\.)\S+/i;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /(?:\+?\d[\s().-]*){9,}/;

const DEFAULT_POLICY = Object.freeze({
  minTitleLength: 6,
  minDescriptionLength: 30,
  recommendPhoto: true,
  warnZeroPrice: true,
  maxRepeatedTokenShare: 0.45,
});

const CATEGORY_POLICY = Object.freeze({
  empleo: { recommendPhoto: false, warnZeroPrice: false },
  servicios: { recommendPhoto: false, warnZeroPrice: false },
  turismo: { warnZeroPrice: false },
});

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeComparable(value) {
  return normalizeText(value)
    .toLocaleLowerCase('es-MX')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenShare(text) {
  const tokens = normalizeComparable(text).split(' ').filter(token => token.length >= 3);
  if (tokens.length < 6) return 0;
  const counts = new Map();
  let max = 0;
  for (const token of tokens) {
    const count = (counts.get(token) || 0) + 1;
    counts.set(token, count);
    max = Math.max(max, count);
  }
  return max / tokens.length;
}

function resolvePolicy(category, overrides = {}) {
  return {
    ...DEFAULT_POLICY,
    ...(CATEGORY_POLICY[normalizeComparable(category)] || {}),
    ...overrides,
  };
}

export function evaluateListingQuality(listing = {}, options = {}) {
  const title = normalizeText(listing.title);
  const description = normalizeText(listing.description);
  const category = normalizeComparable(listing.category);
  const price = Number(listing.price);
  const imageCount = Number.isFinite(Number(listing.imageCount))
    ? Number(listing.imageCount)
    : Array.isArray(listing.images) ? listing.images.length : 0;
  const policy = resolvePolicy(category, options.policy);

  const hardErrors = [];
  const warnings = [];
  const addHard = code => { if (!hardErrors.includes(code)) hardErrors.push(code); };
  const addWarning = code => { if (!warnings.includes(code)) warnings.push(code); };

  if (!category) addHard('category_required');
  if (!title) addHard('title_required');
  if (!description) addHard('description_required');
  if (!Number.isFinite(price)) addHard('price_required');

  if (title && title.length < policy.minTitleLength) addWarning('title_too_short');
  if (description && description.length < policy.minDescriptionLength) addWarning('description_too_short');
  if (Number.isFinite(price) && price <= 0 && policy.warnZeroPrice) addWarning('price_zero_or_negative');
  if (policy.recommendPhoto && imageCount < 1) addWarning('photo_recommended');

  const combined = `${title} ${description}`.trim();
  if (URL_RE.test(combined)) addWarning('url_in_copy');
  if (EMAIL_RE.test(combined) || PHONE_RE.test(combined)) addWarning('contact_in_copy');

  const comparableTitle = normalizeComparable(title);
  const comparableDescription = normalizeComparable(description);
  if (
    comparableTitle &&
    comparableDescription &&
    (comparableTitle === comparableDescription || comparableDescription.startsWith(`${comparableTitle} ${comparableTitle}`))
  ) {
    addWarning('title_description_duplicate');
  }

  if (tokenShare(description) > policy.maxRepeatedTokenShare) addWarning('keyword_stuffing');
  if (/^(.)\1{4,}$/u.test(title.replace(/\s/g, ''))) addWarning('placeholder_like_title');
  if (/^(.)\1{9,}$/u.test(description.replace(/\s/g, ''))) addWarning('placeholder_like_description');

  return {
    ok: hardErrors.length === 0,
    hardErrors,
    warnings,
    signals: {
      imageCount,
      titleLength: title.length,
      descriptionLength: description.length,
      repeatedTokenShare: tokenShare(description),
    },
  };
}

export function buildListingDuplicateFingerprint(listing = {}) {
  const seller = normalizeComparable(listing.sellerId || listing.userId || '');
  const title = normalizeComparable(listing.title);
  const location = normalizeComparable(listing.location || listing.city || listing.state || '');
  const media = Array.isArray(listing.mediaHashes)
    ? listing.mediaHashes.map(normalizeComparable).filter(Boolean).sort().join(',')
    : '';
  return [seller, title, location, media].join('|');
}

export const listingQualityPolicies = Object.freeze({
  default: DEFAULT_POLICY,
  categories: CATEGORY_POLICY,
});
