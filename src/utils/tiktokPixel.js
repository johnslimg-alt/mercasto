const TIKTOK_PIXEL_ID = 'D9C3HKBC77UBS5FSD7C0';

export function initTikTokPixel() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__mercastoTikTokPixelLoaded) return;

  window.__mercastoTikTokPixelLoaded = true;

  /* eslint-disable */
  !function (w, d, t) {
    w.TiktokAnalyticsObject = t;
    var ttq = w[t] = w[t] || [];
    ttq.methods = [
      'page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once',
      'ready', 'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent',
      'revokeConsent', 'grantConsent'
    ];
    ttq.setAndDefer = function (target, method) {
      target[method] = function () {
        target.push([method].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (var i = 0; i < ttq.methods.length; i++) {
      ttq.setAndDefer(ttq, ttq.methods[i]);
    }
    ttq.instance = function (pixelId) {
      var instance = ttq._i[pixelId] || [];
      for (var j = 0; j < ttq.methods.length; j++) {
        ttq.setAndDefer(instance, ttq.methods[j]);
      }
      return instance;
    };
    ttq.load = function (pixelId, options) {
      var url = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      var partner = options && options.partner;
      ttq._i = ttq._i || {};
      ttq._i[pixelId] = [];
      ttq._i[pixelId]._u = url;
      ttq._t = ttq._t || {};
      ttq._t[pixelId] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[pixelId] = options || {};
      var script = d.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = url + '?sdkid=' + pixelId + '&lib=' + t;
      var firstScript = d.getElementsByTagName('script')[0];
      firstScript.parentNode.insertBefore(script, firstScript);
      return partner;
    };
  }(window, document, 'ttq');
  /* eslint-enable */

  window.ttq.load(TIKTOK_PIXEL_ID);
  window.ttq.page();
}
