import assert from 'node:assert/strict';
import test from 'node:test';

// Contract for the "cookie settings" intent registry in src/utils/trackingConsent.js.
//
// The consent dialog is loaded lazily, so a visitor can click a "cookie settings"
// entry point before the dialog has registered its opener. A bare transient event is
// dropped in that window (that was the production defect); the registry remembers the
// intent and flushes it exactly once when the opener appears.

let moduleCounter = 0;

function installFakeBrowser({ consent = null } = {}) {
  const listeners = new Map();
  const localStore = new Map();
  const dispatchedEvents = [];

  if (consent) localStore.set('cookie_consent', consent);

  const addEventListener = (type, handler) => {
    const set = listeners.get(type) || new Set();
    set.add(handler);
    listeners.set(type, set);
  };
  const removeEventListener = (type, handler) => {
    listeners.get(type)?.delete(handler);
  };
  const dispatchEvent = (event) => {
    dispatchedEvents.push(event?.type);
    [...(listeners.get(event?.type) || [])].forEach((handler) => handler(event));
    return true;
  };

  const window = {
    addEventListener,
    removeEventListener,
    dispatchEvent,
    localStorage: {
      getItem: (key) => (localStore.has(key) ? localStore.get(key) : null),
      setItem: (key, value) => localStore.set(key, String(value)),
      removeItem: (key) => localStore.delete(key),
    },
  };

  const previous = {
    window: globalThis.window,
    localStorage: globalThis.localStorage,
  };

  globalThis.window = window;
  globalThis.localStorage = window.localStorage;

  return {
    window,
    localStore,
    dispatchedEvents,
    restore() {
      if (previous.window === undefined) delete globalThis.window;
      else globalThis.window = previous.window;
      if (previous.localStorage === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = previous.localStorage;
    },
  };
}

async function loadConsentModule() {
  moduleCounter += 1;
  return import(`../src/utils/trackingConsent.js?registryCase=${moduleCounter}`);
}

test('a request made before the dialog registers is flushed exactly once on register', async () => {
  const browser = installFakeBrowser();
  try {
    const consent = await loadConsentModule();
    let opened = 0;

    consent.requestOpenCookiePreferences();
    assert.equal(opened, 0, 'nothing can open before an opener exists');
    // The fallback event still fires for listeners that bypass the registry.
    assert.deepEqual(browser.dispatchedEvents, ['mercasto:open-cookie-preferences']);

    const unregister = consent.registerCookiePreferencesOpener(() => { opened += 1; });
    assert.equal(opened, 1, 'the pending intent is flushed when the opener registers');

    // A second registration must not replay the consumed intent.
    unregister();
    consent.registerCookiePreferencesOpener(() => { opened += 1; });
    assert.equal(opened, 1, 'a consumed intent must not replay on a later registration');
  } finally {
    browser.restore();
  }
});

test('a request made after the dialog registered opens it immediately', async () => {
  const browser = installFakeBrowser();
  try {
    const consent = await loadConsentModule();
    let opened = 0;
    consent.registerCookiePreferencesOpener(() => { opened += 1; });

    consent.requestOpenCookiePreferences();
    consent.requestOpenCookiePreferences();

    assert.equal(opened, 2, 'every explicit request reaches the registered opener');
    assert.deepEqual(browser.dispatchedEvents, [], 'a registered opener is invoked directly, without the fallback event');
  } finally {
    browser.restore();
  }
});

test('unregister then request leaves the intent pending for the next registration', async () => {
  const browser = installFakeBrowser();
  try {
    const consent = await loadConsentModule();
    let opened = 0;
    const unregister = consent.registerCookiePreferencesOpener(() => { opened += 1; });
    unregister();

    consent.requestOpenCookiePreferences();
    assert.equal(opened, 0, 'no opener is registered, so nothing opens yet');

    consent.registerCookiePreferencesOpener(() => { opened += 1; });
    assert.equal(opened, 1, 'the pending intent is flushed by the next registration');
  } finally {
    browser.restore();
  }
});

test('a stale cleanup does not unregister a newer opener', async () => {
  const browser = installFakeBrowser();
  try {
    const consent = await loadConsentModule();
    let first = 0;
    let second = 0;
    const unregisterFirst = consent.registerCookiePreferencesOpener(() => { first += 1; });
    consent.registerCookiePreferencesOpener(() => { second += 1; });

    unregisterFirst();
    consent.requestOpenCookiePreferences();

    assert.equal(first, 0, 'the replaced opener must stay unregistered');
    assert.equal(second, 1, 'the newer registration still receives requests');
  } finally {
    browser.restore();
  }
});

test('reopening the dialog never changes stored consent state', async () => {
  for (const stored of ['all', 'essential', null]) {
    const browser = installFakeBrowser({ consent: stored });
    try {
      const consent = await loadConsentModule();
      const before = {
        state: consent.getVendorConsentState(),
        granted: consent.hasVendorConsent(),
      };

      let opened = 0;
      consent.registerCookiePreferencesOpener(() => { opened += 1; });
      consent.requestOpenCookiePreferences();
      assert.equal(opened, 1, `dialog opens for stored consent ${stored}`);

      assert.equal(consent.getVendorConsentState(), before.state, `vendor consent state unchanged for ${stored}`);
      assert.equal(consent.hasVendorConsent(), before.granted, `vendor consent grant unchanged for ${stored}`);
      assert.equal(browser.localStore.get('cookie_consent') ?? null, stored, 'stored decision unchanged');
    } finally {
      browser.restore();
    }
  }
});
