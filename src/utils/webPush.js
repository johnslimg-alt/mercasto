export function urlBase64ToUint8Array(base64String) {
  const value = String(base64String || '').trim();
  if (!value) throw new Error('Missing VAPID public key');

  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = globalThis.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output;
}

export function applicationServerKeyMatches(subscription, vapidKey) {
  const existing = subscription?.options?.applicationServerKey;
  if (!existing) return false;

  const expected = urlBase64ToUint8Array(vapidKey);
  const actual = new Uint8Array(existing);
  if (actual.length !== expected.length) return false;

  return actual.every((byte, index) => byte === expected[index]);
}

export async function fetchVapidPublicKey(apiBase, fetchImpl = globalThis.fetch) {
  const base = String(apiBase || '/api').replace(/\/$/, '');
  const response = await fetchImpl(`${base}/push/vapid-key`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`VAPID key unavailable (${response.status})`);
  }

  const payload = await response.json();
  const publicKey = String(payload?.publicKey || '').trim();
  if (!publicKey) throw new Error('VAPID key unavailable');

  return publicKey;
}

export async function ensurePushSubscription(registration, vapidKey) {
  if (!registration?.pushManager) {
    throw new Error('PushManager unavailable');
  }

  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !applicationServerKeyMatches(subscription, vapidKey)) {
    await subscription.unsubscribe();
    subscription = null;
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  return subscription;
}
