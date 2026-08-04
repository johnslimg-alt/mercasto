const RENEWAL_ENDPOINT = /\/api\/ads\/\d+\/(?:renew|republish|activate)(?:\?|$)/;

export function isSafePaymentUrl(rawUrl, currentOrigin = globalThis?.location?.origin) {
  if (!rawUrl) return false;
  const candidate = String(rawUrl).trim();
  if (!/^https?:\/\//i.test(candidate)) return false;
  try {
    const parsed = new URL(candidate, currentOrigin || 'https://mercasto.com');
    if (parsed.protocol === 'https:') return true;
    return parsed.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function installPaidAdRenewalBridge() {
  if (typeof window === 'undefined' || window.__mercastoPaidRenewalBridgeInstalled) return;

  window.__mercastoPaidRenewalBridgeInstalled = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    const url = typeof input === 'string' ? input : input?.url || '';

    if (response.status !== 402 || !RENEWAL_ENDPOINT.test(url)) {
      return response;
    }

    try {
      const payload = await response.clone().json();
      if (payload?.payment_required && isSafePaymentUrl(payload?.payment_url, window.location.origin)) {
        window.location.assign(payload.payment_url);
      }
    } catch {
      // Preserve the original response for the existing UI error handler.
    }

    return response;
  };
}
