/**
 * Deterministic reproduction for the consent-settings entry point race.
 *
 * Hypothesis: CookieBanner is React.lazy (separate chunk) and attaches its
 * 'mercasto:open-cookie-preferences' listener only in its mount effect. The footer
 * button dispatches a transient CustomEvent, so a click that arrives before the
 * chunk has mounted is lost with no feedback and no retry.
 *
 * usage: node probe-consent-open.mjs <baseUrl> <chunkDelayMs> [clickDelayMs]
 */
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:15603';
const chunkDelayMs = Number(process.argv[3] || 0);
const clickDelayMs = Number(process.argv[4] || 0);

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'es-MX' });
const page = await ctx.newPage();

const VENDOR_HOSTS = ['connect.facebook.net', 'analytics.tiktok.com', 'www.googletagmanager.com', 'bat.bing.com', 'www.clarity.ms', 'clarity.ms'];

await page.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.protocol.startsWith('data')) return route.continue();
  const isApp = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
  if (!isApp) {
    if (VENDOR_HOSTS.includes(url.hostname)) {
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: `/* ${url.hostname} stub */` });
    }
    return route.fulfill({ status: 204, contentType: 'application/json', body: '{}' });
  }
  // Delay the lazily loaded consent dialog chunk to emulate a slow/loaded runner.
  if (chunkDelayMs && /CookieBanner-.*\.js$/.test(url.pathname)) {
    await new Promise((r) => setTimeout(r, chunkDelayMs));
  }
  return route.continue();
});

// Timestamp when the app attaches the open-preferences listener, and when the
// footer click dispatches the event.
await page.addInitScript(() => {
  const T0 = performance.now();
  window.__probe = { t0: T0, listenerAt: null, dispatchAt: null, chunkRequestedAt: null, chunkLoadedAt: null };
  const origAdd = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, ...rest) {
    if (type === 'mercasto:open-cookie-preferences' && window.__probe.listenerAt === null) {
      window.__probe.listenerAt = Math.round(performance.now() - T0);
    }
    return origAdd.call(this, type, ...rest);
  };
  const origDispatch = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function (event) {
    if (event && event.type === 'mercasto:open-cookie-preferences') {
      window.__probe.dispatchAt = Math.round(performance.now() - T0);
    }
    return origDispatch.call(this, event);
  };
  localStorage.setItem('cookiesAccepted', 'true');
  localStorage.setItem('lang', 'es');
  localStorage.setItem('mercasto_language', 'es');
  localStorage.setItem('cookie_consent', 'all');
});

const snap = () => page.evaluate(() => ({
  ...window.__probe,
  bannerInDom: Boolean(document.querySelector('[data-testid="cookie-banner"]')),
  footerButtonInDom: Boolean(document.querySelector('[data-testid="cookie-settings"]')),
}));

console.log(`\n=== probe consent-open chunkDelay=${chunkDelayMs}ms clickDelay=${clickDelayMs}ms ===`);
await page.goto(base + '/', { waitUntil: 'domcontentloaded' });

const settings = page.getByTestId('cookie-settings');
await settings.waitFor({ state: 'attached', timeout: 15000 });
if (clickDelayMs) await page.waitForTimeout(clickDelayMs);

const beforeClick = await snap();
await settings.scrollIntoViewIfNeeded();
let firstClickError = null;
try {
  await settings.click({ timeout: 5000 });
} catch (e) {
  firstClickError = String(e.message).split('\n')[0].slice(0, 90);
}
await page.waitForTimeout(400);
const afterFirstClick = await snap();

// Second click, after any chunk delay has certainly elapsed. If the banner is
// already open it covers the footer button, so a failed click here is expected.
await page.waitForTimeout(chunkDelayMs + 1500);
let secondClickError = null;
try {
  await settings.click({ timeout: 5000 });
} catch (e) {
  secondClickError = String(e.message).split('\n')[0].slice(0, 90);
}
await page.waitForTimeout(400);
const afterSecondClick = await snap();

console.log('before click      :', JSON.stringify(beforeClick));
console.log('after 1st click   :', JSON.stringify(afterFirstClick), firstClickError ? `(click error: ${firstClickError})` : '');
console.log('after 2nd click   :', JSON.stringify(afterSecondClick), secondClickError ? `(click error: ${secondClickError})` : '');
const verdict = afterFirstClick.bannerInDom ? 'OPENED_ON_FIRST_CLICK' : (afterSecondClick.bannerInDom ? 'LOST_FIRST_CLICK_RECOVERED_ON_SECOND' : 'NEVER_OPENED');
console.log('VERDICT:', verdict);

await browser.close();
