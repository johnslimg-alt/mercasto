const RENEWAL_ENDPOINT = /\/api\/ads\/\d+\/(?:renew|republish|activate)(?:\?|$)/;

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
      if (payload?.payment_required && payload?.payment_url) {
        window.location.assign(payload.payment_url);
      }
    } catch {
      // Preserve the original response for the existing UI error handler.
    }

    return response;
  };
}
