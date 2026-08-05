import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applicationServerKeyMatches,
  ensurePushSubscription,
  fetchVapidPublicKey,
  urlBase64ToUint8Array,
} from '../src/utils/webPush.js';

const TEST_KEY = 'AQIDBA';

test('decodes URL-safe base64 VAPID keys', () => {
  assert.deepEqual([...urlBase64ToUint8Array(TEST_KEY)], [1, 2, 3, 4]);
  assert.throws(() => urlBase64ToUint8Array(''), /Missing VAPID/);
});

test('compares the subscription application server key', () => {
  const matching = {
    options: { applicationServerKey: Uint8Array.from([1, 2, 3, 4]).buffer },
  };
  const different = {
    options: { applicationServerKey: Uint8Array.from([4, 3, 2, 1]).buffer },
  };

  assert.equal(applicationServerKeyMatches(matching, TEST_KEY), true);
  assert.equal(applicationServerKeyMatches(different, TEST_KEY), false);
  assert.equal(applicationServerKeyMatches(null, TEST_KEY), false);
});

test('fetches the VAPID public key from the backend without caching', async () => {
  let requestedUrl = null;
  let requestedOptions = null;
  const key = await fetchVapidPublicKey('/api/', async (url, options) => {
    requestedUrl = url;
    requestedOptions = options;
    return {
      ok: true,
      status: 200,
      json: async () => ({ publicKey: TEST_KEY }),
    };
  });

  assert.equal(key, TEST_KEY);
  assert.equal(requestedUrl, '/api/push/vapid-key');
  assert.equal(requestedOptions.cache, 'no-store');
});

test('rejects missing or unavailable backend VAPID keys', async () => {
  await assert.rejects(
    () => fetchVapidPublicKey('/api', async () => ({ ok: false, status: 503 })),
    /503/,
  );
  await assert.rejects(
    () => fetchVapidPublicKey('/api', async () => ({
      ok: true,
      status: 200,
      json: async () => ({ publicKey: null }),
    })),
    /unavailable/,
  );
});

test('reuses a matching subscription', async () => {
  let subscribed = false;
  const existing = {
    options: { applicationServerKey: Uint8Array.from([1, 2, 3, 4]).buffer },
    unsubscribe: async () => true,
  };
  const registration = {
    pushManager: {
      getSubscription: async () => existing,
      subscribe: async () => {
        subscribed = true;
        return {};
      },
    },
  };

  assert.equal(await ensurePushSubscription(registration, TEST_KEY), existing);
  assert.equal(subscribed, false);
});

test('replaces a subscription created with a different VAPID key', async () => {
  let unsubscribed = false;
  let receivedOptions = null;
  const replacement = { endpoint: 'replacement' };
  const existing = {
    options: { applicationServerKey: Uint8Array.from([4, 3, 2, 1]).buffer },
    unsubscribe: async () => {
      unsubscribed = true;
      return true;
    },
  };
  const registration = {
    pushManager: {
      getSubscription: async () => existing,
      subscribe: async (options) => {
        receivedOptions = options;
        return replacement;
      },
    },
  };

  assert.equal(await ensurePushSubscription(registration, TEST_KEY), replacement);
  assert.equal(unsubscribed, true);
  assert.equal(receivedOptions.userVisibleOnly, true);
  assert.deepEqual([...receivedOptions.applicationServerKey], [1, 2, 3, 4]);
});
