const STYLE_ID = 'mercasto-ad-expiry-countdown-styles';
const BADGE_ATTRIBUTE = 'data-mercasto-ad-expiry-countdown';
const API_HINT = /\/api\/(?:ads|search|home|feed|categories|favorites|profile)/i;
const AD_PATH = /\/(?:ads?|products?|publications?|anuncios?)\/(\d+)(?:\/|$|\?|#)/i;

const expiryByAdId = new Map();
let refreshTimer = null;
let scanQueued = false;

function normalizeExpiry(value) {
  if (!value) return null;

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function extractAdId(value) {
  const candidate = value?.id ?? value?.ad_id ?? value?.adId;
  const id = Number(candidate);
  return Number.isInteger(id) && id > 0 ? String(id) : null;
}

function collectExpiries(payload, visited = new WeakSet()) {
  if (!payload || typeof payload !== 'object' || visited.has(payload)) return;
  visited.add(payload);

  if (Array.isArray(payload)) {
    payload.forEach((item) => collectExpiries(item, visited));
    return;
  }

  const adId = extractAdId(payload);
  const expiresAt = normalizeExpiry(payload.expires_at ?? payload.expiresAt);

  if (adId && expiresAt) {
    expiryByAdId.set(adId, expiresAt);
  }

  Object.values(payload).forEach((value) => collectExpiries(value, visited));
}

function parseAdIdFromHref(href) {
  if (!href) return null;

  try {
    const url = new URL(href, window.location.origin);
    return url.pathname.match(AD_PATH)?.[1] ?? null;
  } catch {
    return href.match(AD_PATH)?.[1] ?? null;
  }
}

function formatRemaining(milliseconds) {
  if (milliseconds <= 0) {
    return { text: 'Finalizado', state: 'expired' };
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return {
      text: `Termina en ${days}d ${hours}h`,
      state: days < 3 ? 'warning' : 'normal',
    };
  }

  if (hours > 0) {
    return {
      text: `Termina en ${hours}h ${minutes}min`,
      state: 'urgent',
    };
  }

  return {
    text: `Termina en ${minutes}min ${seconds}s`,
    state: 'urgent',
  };
}

function createBadge(adId, variant = 'card') {
  const badge = document.createElement('span');
  badge.setAttribute(BADGE_ATTRIBUTE, adId);
  badge.dataset.variant = variant;
  badge.className = `mercasto-ad-expiry-countdown mercasto-ad-expiry-countdown--${variant}`;
  badge.setAttribute('role', 'status');
  badge.setAttribute('aria-live', 'off');
  badge.innerHTML = '<span aria-hidden="true">⏱</span><span data-countdown-text></span>';
  return badge;
}

function updateBadge(badge) {
  const adId = badge.getAttribute(BADGE_ATTRIBUTE);
  const expiry = expiryByAdId.get(adId);
  if (!expiry) return;

  const remaining = formatRemaining(expiry - Date.now());
  const text = badge.querySelector('[data-countdown-text]');
  if (text) text.textContent = remaining.text;

  badge.dataset.state = remaining.state;
  badge.title = new Date(expiry).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function attachCardBadges() {
  const links = document.querySelectorAll(
    'a[href*="/ad/"], a[href*="/ads/"], a[href*="/product/"], a[href*="/products/"], a[href*="/publication/"], a[href*="/publications/"], a[href*="/anuncio/"], a[href*="/anuncios/"]',
  );

  links.forEach((link) => {
    const adId = parseAdIdFromHref(link.getAttribute('href'));
    if (!adId || !expiryByAdId.has(adId)) return;

    const container = link.closest(
      '[data-ad-id], article, li, [class*="card" i], [class*="product" i], [class*="listing" i], [class*="item" i]',
    ) || link;

    if (container.querySelector(`.mercasto-ad-expiry-countdown--card[${BADGE_ATTRIBUTE}="${adId}"]`)) {
      return;
    }

    if (window.getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    const badge = createBadge(adId, 'card');
    container.appendChild(badge);
    updateBadge(badge);
  });
}

function attachDetailBadge() {
  const adId = parseAdIdFromHref(window.location.href);
  if (!adId || !expiryByAdId.has(adId)) return;

  if (document.querySelector(`.mercasto-ad-expiry-countdown--detail[${BADGE_ATTRIBUTE}="${adId}"]`)) {
    return;
  }

  const heading = document.querySelector('main h1, [data-ad-title], h1');
  if (!heading) return;

  const badge = createBadge(adId, 'detail');
  heading.insertAdjacentElement('afterend', badge);
  updateBadge(badge);
}

function refreshCountdowns() {
  document.querySelectorAll(`[${BADGE_ATTRIBUTE}]`).forEach(updateBadge);
}

function scanPage() {
  scanQueued = false;
  attachCardBadges();
  attachDetailBadge();
  refreshCountdowns();
}

function queueScan() {
  if (scanQueued) return;
  scanQueued = true;
  window.requestAnimationFrame(scanPage);
}

function ingestPayload(payload) {
  const sizeBefore = expiryByAdId.size;
  collectExpiries(payload);

  if (expiryByAdId.size !== sizeBefore || expiryByAdId.size > 0) {
    queueScan();
  }
}

function shouldInspect(url) {
  return typeof url === 'string' && API_HINT.test(url);
}

function installFetchInterceptor() {
  if (typeof window.fetch !== 'function') return;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    const url = typeof input === 'string' ? input : input?.url || '';

    if (shouldInspect(url)) {
      response.clone().json().then(ingestPayload).catch(() => {});
    }

    return response;
  };
}

function installXhrInterceptor() {
  if (typeof window.XMLHttpRequest !== 'function') return;

  const originalOpen = window.XMLHttpRequest.prototype.open;
  const originalSend = window.XMLHttpRequest.prototype.send;

  window.XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
    this.__mercastoExpiryUrl = String(url || '');
    return originalOpen.call(this, method, url, ...rest);
  };

  window.XMLHttpRequest.prototype.send = function patchedSend(...args) {
    if (shouldInspect(this.__mercastoExpiryUrl)) {
      this.addEventListener('load', () => {
        try {
          const payload = this.responseType === 'json'
            ? this.response
            : JSON.parse(this.responseText);
          ingestPayload(payload);
        } catch {
          // Ignore non-JSON and malformed responses.
        }
      }, { once: true });
    }

    return originalSend.apply(this, args);
  };
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .mercasto-ad-expiry-countdown {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      width: max-content;
      max-width: calc(100% - 1rem);
      padding: 0.35rem 0.55rem;
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.94);
      color: #334155;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
      font-size: 0.75rem;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
      z-index: 4;
      pointer-events: none;
      backdrop-filter: blur(6px);
    }

    .mercasto-ad-expiry-countdown--card {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
    }

    .mercasto-ad-expiry-countdown--detail {
      margin: 0.5rem 0 0.75rem;
      font-size: 0.85rem;
    }

    .mercasto-ad-expiry-countdown[data-state="warning"] {
      background: rgba(255, 247, 237, 0.96);
      color: #9a3412;
      border-color: rgba(234, 88, 12, 0.25);
    }

    .mercasto-ad-expiry-countdown[data-state="urgent"],
    .mercasto-ad-expiry-countdown[data-state="expired"] {
      background: rgba(254, 242, 242, 0.96);
      color: #b91c1c;
      border-color: rgba(220, 38, 38, 0.25);
    }

    @media (max-width: 640px) {
      .mercasto-ad-expiry-countdown--card {
        top: 0.35rem;
        right: 0.35rem;
        padding: 0.3rem 0.45rem;
        font-size: 0.68rem;
      }
    }
  `;
  document.head.appendChild(style);
}

export function installAdExpiryCountdown() {
  if (typeof window === 'undefined' || window.__mercastoAdExpiryCountdownInstalled) return;

  window.__mercastoAdExpiryCountdownInstalled = true;
  installStyles();
  installFetchInterceptor();
  installXhrInterceptor();

  const observer = new MutationObserver(queueScan);
  const start = () => {
    observer.observe(document.body, { childList: true, subtree: true });
    queueScan();
  };

  if (document.body) start();
  else window.addEventListener('DOMContentLoaded', start, { once: true });

  window.addEventListener('popstate', queueScan);
  window.addEventListener('hashchange', queueScan);
  refreshTimer = window.setInterval(refreshCountdowns, 1000);

  window.addEventListener('pagehide', () => {
    if (refreshTimer) window.clearInterval(refreshTimer);
    observer.disconnect();
  }, { once: true });
}
