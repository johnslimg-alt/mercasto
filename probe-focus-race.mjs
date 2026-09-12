/**
 * Focus-race probe for tests/e2e/seller-registration-redirect.spec.js
 *
 * Hypothesis (from CI failure evidence): Playwright's fill() for text/email/password
 * inputs is focus()+select() in the page, followed by a SEPARATE
 * keyboard.insertText() that types into whatever element currently has focus.
 * App.jsx has an effect keyed on [showAuthModal, authMode, requiresTwoFactor] that
 * focuses the FIRST input inside the dialog on the next animation frame. When that
 * frame lands between fill()'s focus and its insertText, the text is typed into the
 * wrong field.
 *
 * This probe records every programmatic focus() with a stack and every value change,
 * and reports the failure signature (password text landing in the name input).
 *
 * usage: node probe-focus-race.mjs <baseUrl> [iterations]
 */
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:15602';
const iterations = Number(process.argv[3] || 1);

const browser = await chromium.launch({ args: ['--no-sandbox'] });

let corrupted = 0;
let passed = 0;

for (let iter = 1; iter <= iterations; iter++) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    hasTouch: false,
    isMobile: false,
  });
  const page = await ctx.newPage();

  await page.addInitScript(() => {
    const T0 = performance.now();
    const log = [];
    window.__focusLog = log;
    const rec = (type, detail) => log.push({ t: Math.round(performance.now() - T0), type, detail });
    window.__rec = rec;
    const stack = () => (new Error().stack || '').split('\n').slice(2, 6).map(s => s.trim().replace(/https?:\/\/[^ ]*\/assets\//, '')).join(' | ');

    const describe = (el) => el && el.tagName
      ? `${el.tagName.toLowerCase()}${el.name ? '[name=' + el.name + ']' : ''}${el.type ? '[' + el.type + ']' : ''}`
      : String(el);

    // Trace every programmatic focus() inside the auth dialog.
    const origFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function () {
      const inDialog = this.closest && this.closest('[role="dialog"]');
      if (inDialog) rec('FOCUS_CALL', { el: describe(this), stack: stack() });
      return origFocus.apply(this, arguments);
    };

    // Trace every value change on the register fields.
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(HTMLInputElement.prototype, 'value', {
      configurable: true,
      get() { return desc.get.call(this); },
      set(v) {
        if (['name', 'email', 'password'].includes(this.name)) {
          const before = desc.get.call(this);
          desc.set.call(this, v);
          rec('VALUE_WRITE', { field: this.name, from: String(before).slice(0, 40), to: String(v).slice(0, 40) });
        } else {
          desc.set.call(this, v);
        }
      },
    });

    for (const ev of ['focusin', 'input']) {
      window.addEventListener(ev, (e) => {
        const t = e.target;
        if (!t || !t.name) return;
        if (ev === 'focusin') rec('FOCUSIN', { el: describe(t) });
        else rec('INPUT_EVENT', { el: describe(t), value: String(t.value).slice(0, 40) });
      }, true);
    }
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/api/register' && request.method() === 'POST') {
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ user: { id: 991001, name: 'Seller Redirect Test', email: 'seller-redirect@example.com', role: 'individual' }, access_token: 'e2e-registration-token' }) });
    }
    if (path === '/api/categories') return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (path === '/api/ads' || path.startsWith('/api/ads/')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, per_page: 16 }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  let verdict = 'PASSED';
  let detail = null;
  try {
    await page.goto(base + '/post', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'No tienes cuenta? Únete' }).click({ timeout: 15000 });
    const form = page.locator('form').filter({ has: page.locator('input[name="name"]') });
    await form.locator('input[name="name"]').fill('Seller Redirect Test');
    await form.locator('input[name="email"]').fill('seller-redirect@example.com');
    await form.locator('input[name="password"]').fill('SecurePass123!');
    const consent = form.locator('input[type="checkbox"]');
    await consent.check();

    const state = await form.evaluate((f) => ({
      name: f.querySelector('input[name="name"]').value,
      email: f.querySelector('input[name="email"]').value,
      password: f.querySelector('input[name="password"]').value,
      checked: f.querySelector('input[type="checkbox"]').checked,
      valid: f.checkValidity(),
      active: document.activeElement ? `${document.activeElement.tagName.toLowerCase()}${document.activeElement.name ? '[' + document.activeElement.name + ']' : ''}` : null,
      dialogs: document.querySelectorAll('[role="dialog"]').length,
    }));
    detail = state;
    if (state.name !== 'Seller Redirect Test' || state.password !== 'SecurePass123!' || !state.valid) {
      verdict = 'CORRUPTED';
      corrupted++;
    } else {
      passed++;
    }
  } catch (e) {
    verdict = 'ERROR: ' + String(e.message).split('\n')[0].slice(0, 120);
  }

  console.log(`ITER ${iter}: ${verdict} ${detail ? JSON.stringify(detail) : ''}`);
  if (verdict !== 'PASSED') {
    const fl = await page.evaluate(() => window.__focusLog).catch(() => []);
    console.log(`  focus log (${fl.length}):`);
    for (const e of fl) console.log('   ', JSON.stringify(e));
  }
  await ctx.close();
}

console.log(`\nSUMMARY: passed=${passed} corrupted=${corrupted} of ${iterations}`);
await browser.close();
