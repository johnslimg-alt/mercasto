export const BUYER_NUDGE_STORAGE_KEY = 'mercasto.buyer_nudge.v1';
export const BUYER_NUDGE_BUCKET_KEY = 'mercasto.buyer_nudge_bucket.v1';
export const BUYER_NUDGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const SENSITIVE_ROUTE_PATTERNS = [
  /^\/login\/?$/,
  /^\/register\/?$/,
  /^\/post\/?$/,
  /^\/publish\/?$/,
  /^\/publicar-gratis\/?$/,
  /^\/vendedores\/?$/,
  /^\/ayuda\/publicar-anuncio\/?$/,
  /^\/account(?:\/|$)/,
  /^\/profile\/?$/,
  /^\/admin(?:\/|$)/,
  /^\/dashboard(?:\/|$)/,
  /^\/notificaciones\/?$/,
  /^\/mensajes\/?$/,
  /^\/perfil(?:\/|$)/,
  /^\/anuncio\/[^/]+\/editar(?:\/|$)/,
  /^\/payment(?:\/|$)/,
  /^\/payments(?:\/|$)/,
  /^\/checkout(?:\/|$)/,
  /^\/tarifas\/?$/,
  /^\/referidos\/?$/,
  /^\/verificar-email\/?$/,
  /^\/moderacion(?:\/|$)/,
  /^\/reembolsos(?:\/|$)/,
];

export function normalizeBuyerNudgeRollout(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, Math.floor(number)));
}

export function isBuyerNudgeRouteEligible(pathname = '/') {
  const path = String(pathname || '/');
  return !SENSITIVE_ROUTE_PATTERNS.some((pattern) => pattern.test(path));
}

export function isBuyerNudgeFrequencyCapOpen(lastShownAt, now = Date.now()) {
  const previous = Number(lastShownAt || 0);
  return !Number.isFinite(previous) || previous <= 0 || now - previous >= BUYER_NUDGE_COOLDOWN_MS;
}

export function isBuyerNudgeBucketEligible(bucket, rolloutPercent) {
  const percent = normalizeBuyerNudgeRollout(rolloutPercent);
  const normalizedBucket = Number(bucket);
  if (!Number.isFinite(normalizedBucket) || normalizedBucket < 0 || normalizedBucket > 99) return false;
  return normalizedBucket < percent;
}

export function readOrCreateBuyerNudgeBucket(storage = globalThis.localStorage) {
  if (!storage) return null;
  try {
    const rawExisting = storage.getItem(BUYER_NUDGE_BUCKET_KEY);
    if (rawExisting !== null && rawExisting !== '') {
      const existing = Number(rawExisting);
      if (Number.isInteger(existing) && existing >= 0 && existing <= 99) return existing;
    }
    const random = globalThis.crypto?.getRandomValues
      ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
      : Math.random();
    const bucket = Math.min(99, Math.floor(random * 100));
    storage.setItem(BUYER_NUDGE_BUCKET_KEY, String(bucket));
    return bucket;
  } catch {
    return null;
  }
}

export function readBuyerNudgeState(storage = globalThis.localStorage) {
  if (!storage) return {};
  try {
    const raw = storage.getItem(BUYER_NUDGE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeBuyerNudgeState(patch, storage = globalThis.localStorage) {
  if (!storage) return;
  try {
    const next = { ...readBuyerNudgeState(storage), ...patch };
    storage.setItem(BUYER_NUDGE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Privacy-restricted browsers can block storage. The nudge should fail closed.
  }
}
