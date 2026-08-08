import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  BUYER_NUDGE_BUCKET_KEY,
  BUYER_NUDGE_COOLDOWN_MS,
  isBuyerNudgeBucketEligible,
  isBuyerNudgeFrequencyCapOpen,
  isBuyerNudgeRouteEligible,
  normalizeBuyerNudgeRollout,
  readOrCreateBuyerNudgeBucket,
} from '../src/utils/buyerNudge.js';
import { BUYER_NUDGE_COPY } from '../src/components/buyerNudgeCopy.js';

const languages = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'he', 'yi', 'ru', 'ja'];

test('rollout stays off unless explicitly enabled', () => {
  assert.equal(normalizeBuyerNudgeRollout(undefined), 0);
  assert.equal(normalizeBuyerNudgeRollout(-4), 0);
  assert.equal(normalizeBuyerNudgeRollout(101), 100);
  assert.equal(isBuyerNudgeBucketEligible(0, 0), false);
  assert.equal(isBuyerNudgeBucketEligible(4, 5), true);
  assert.equal(isBuyerNudgeBucketEligible(5, 5), false);
});

test('fresh browsers receive a persisted random rollout bucket instead of defaulting to bucket zero', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
  };
  const originalCrypto = globalThis.crypto;
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { getRandomValues: (array) => { array[0] = Math.ceil(0.73 * 2 ** 32); return array; } },
  });
  try {
    const first = readOrCreateBuyerNudgeBucket(storage);
    assert.equal(first, 73);
    assert.equal(storage.getItem(BUYER_NUDGE_BUCKET_KEY), '73');
    assert.equal(readOrCreateBuyerNudgeBucket(storage), 73);
  } finally {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: originalCrypto });
  }
});

test('sensitive auth publish account admin and payment routes are excluded', () => {
  for (const path of ['/login', '/register', '/post', '/publish', '/account/billing', '/profile', '/admin', '/mensajes', '/checkout', '/tarifas', '/anuncio/abc-123/editar', '/vendedores', '/publicar-gratis', '/ayuda/publicar-anuncio']) {
    assert.equal(isBuyerNudgeRouteEligible(path), false, path);
  }
  for (const path of ['/', '/listings', '/motor', '/inmuebles', '/ads/6432', '/anuncio/6432']) {
    assert.equal(isBuyerNudgeRouteEligible(path), true, path);
  }
});

test('frequency cap is seven days', () => {
  const now = Date.UTC(2026, 7, 8, 0, 0, 0);
  assert.equal(isBuyerNudgeFrequencyCapOpen(0, now), true);
  assert.equal(isBuyerNudgeFrequencyCapOpen(now - BUYER_NUDGE_COOLDOWN_MS + 1, now), false);
  assert.equal(isBuyerNudgeFrequencyCapOpen(now - BUYER_NUDGE_COOLDOWN_MS, now), true);
});

test('copy covers the complete current locale set', () => {
  assert.deepEqual(Object.keys(BUYER_NUDGE_COPY).sort(), [...languages].sort());
  for (const lang of languages) {
    for (const key of ['title', 'body', 'cta', 'dismiss']) assert.ok(BUYER_NUDGE_COPY[lang][key]?.trim(), `${lang}.${key}`);
  }
});

test('component uses current auth modal and never revives legacy post/auth-token state', () => {
  const component = fs.readFileSync('src/components/BuyerConversionNudge.jsx', 'utf8');
  const app = fs.readFileSync('src/App.jsx', 'utf8');
  const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
  assert.match(component, /SIGN_UP_ATTEMPT/);
  assert.match(component, /BUYER_NUDGE_IMPRESSION/);
  assert.match(component, /BUYER_NUDGE_DISMISSED/);
  assert.match(component, /BUYER_NUDGE_REGISTER_CLICK/);
  assert.doesNotMatch(component, /auth_token|\/post/);
  assert.match(app, /setAuthMode\('register'\)/);
  assert.match(app, /<BuyerConversionNudge/);
  assert.match(dockerfile, /ARG VITE_BUYER_NUDGE_ROLLOUT_PERCENT=0/);
});
