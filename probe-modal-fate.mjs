/**
 * Fine-grained instrumented reproduction of
 * tests/e2e/seller-registration-redirect.spec.js
 *
 * Adds:
 *  - a setter trace on HTMLInputElement.checked (who resets the consent box, with stack)
 *  - DOM node identity tracking (detects a silent remount of the register form)
 *  - a per-frame signature sampler
 *  - a "settle" window between the checkbox assertion and the validity poll so a
 *    late-arriving re-render/close shows up instead of being masked by the poll.
 *
 * usage: node probe-modal-fate.mjs <baseUrl> [desktop|mobile] [cpuRate] [settleMs]
 */
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:15601';
const mode = process.argv[3] || 'desktop';
const cpuRate = Number(process.argv[4] || 1);
const settleMs = Number(process.argv[5] || 0);

const vp = mode === 'mobile' ? { width: 412, height: 915 } : { width: 1440, height: 1000 };

const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({
  viewport: vp,
  hasTouch: mode === 'mobile',
  isMobile: mode === 'mobile',
  userAgent: mode === 'mobile'
    ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    : undefined,
});
const page = await ctx.newPage();
if (cpuRate > 1) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
}

await page.addInitScript(() => {
  const T0 = performance.now();
  const fate = [];
  window.__fate = fate;
  const stamp = () => Math.round(performance.now() - T0);
  const rec = (type, detail) => { try { fate.push({ t: stamp(), type, detail }); } catch {} };
  window.__rec = rec;
  const stack = (skip = 0) => (new Error().stack || '').split('\n').slice(2 + skip, 5 + skip).map(s => s.trim().replace(/https?:\/\/[^ ]*\/assets\//, '')).join(' | ');

  // ---------- identity tracking ----------
  let idSeq = 0;
  const ids = new WeakMap();
  const nid = (n) => { if (!n) return null; if (!ids.has(n)) ids.set(n, ++idSeq); return ids.get(n); };

  // ---------- trace React writes to input.checked ----------
  const checkedDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked');
  Object.defineProperty(HTMLInputElement.prototype, 'checked', {
    configurable: true,
    get() { return checkedDesc.get.call(this); },
    set(v) {
      if (this.name === 'age_confirmed') {
        rec('REACT_WROTE_CHECKED', { value: v, stack: stack(4) });
      }
      return checkedDesc.set.call(this, v);
    },
  });

  // ---------- dialogs ----------
  const describe = (n) => {
    if (!n || n.nodeType !== 1) return String(n);
    const d = n.matches && n.matches('[role="dialog"]') ? n : (n.querySelector && n.querySelector('[role="dialog"]'));
    return `${n.tagName.toLowerCase()}${n.className ? '.' + String(n.className).slice(0, 50) : ''} dialogRole=${d ? 'self' : 'none'} nid=${nid(n)}`;
  };
  const isInteresting = (n) => n && n.nodeType === 1 && n.querySelector && (
    n.querySelector('[role="dialog"]') || n.querySelector('input[name="age_confirmed"]') || (n.matches && n.matches('[role="dialog"]'))
  );
  const origRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (isInteresting(child)) rec('removeChild', { parent: describe(this), child: describe(child), stack: stack(2) });
    return origRemoveChild.apply(this, arguments);
  };
  const origAppend = Node.prototype.appendChild;
  Node.prototype.appendChild = function (child) {
    if (isInteresting(child)) rec('appendChild', { el: describe(child), stack: stack(2) });
    return origAppend.apply(this, arguments);
  };

  // ---------- navigation / lifecycle ----------
  for (const fn of ['pushState', 'replaceState']) {
    const orig = history[fn].bind(history);
    history[fn] = function (s, t, u) { rec('history.' + fn, { url: String(u), stack: stack(1) }); return orig(s, t, u); };
  }
  for (const fn of ['back', 'forward', 'go']) {
    const orig = history[fn].bind(history);
    history[fn] = function () { rec('history.' + fn, { args: [...arguments].join(',') }); return orig.apply(history, arguments); };
  }
  for (const ev of ['popstate', 'hashchange', 'pageshow', 'pagehide', 'beforeunload', 'visibilitychange', 'resize', 'scroll']) {
    window.addEventListener(ev, () => rec('win.' + ev, { url: location.href, vis: document.visibilityState }), true);
  }
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') rec('win.keydown', { key: e.key }); }, true);
  window.addEventListener('click', (e) => {
    const t = e.target;
    rec('win.click', { target: t && t.tagName ? `${t.tagName.toLowerCase()}${t.name ? '[name=' + t.name + ']' : ''}${t.type ? '[' + t.type + ']' : ''}` : String(t) });
  }, true);

  // ---------- sample ----------
  window.__sample = () => {
    const dialogs = [...document.querySelectorAll('[role="dialog"]')];
    const form = [...document.querySelectorAll('form')].find(f => f.querySelector('input[name="name"]'));
    const cb = form ? form.querySelector('input[name="age_confirmed"]') : null;
    let invalid = [];
    if (form) for (const el of form.elements) if (el.willValidate && !el.checkValidity()) invalid.push(el.name || el.type);
    return {
      url: location.pathname + location.search + location.hash,
      dialogs: dialogs.length,
      dNids: dialogs.map(nid),
      dLabels: dialogs.map(d => (d.getAttribute('aria-label') || d.getAttribute('aria-labelledby') || (d.textContent || '').trim().slice(0, 18))),
      forms: document.querySelectorAll('form').length,
      formNid: nid(form),
      cbNid: nid(cb),
      nameNid: nid(form ? form.querySelector('input[name="name"]') : null),
      nameVal: form ? form.querySelector('input[name="name"]').value : null,
      emailVal: form ? form.querySelector('input[name="email"]').value : null,
      cbChecked: cb ? cb.checked : null,
      valid: form ? form.checkValidity() : null,
      invalid,
    };
  };
  let last = '';
  const tick = () => {
    try {
      const s = window.__sample();
      const sig = JSON.stringify({ ...s, nameVal: undefined, emailVal: undefined, dLabels: undefined });
      if (sig !== last) { last = sig; rec('SAMPLE', s); }
    } catch {}
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

// ------------------------------------------------------------------- mocks
let registrationPayload = null;
await page.route('**/api/**', async (route) => {
  const request = route.request();
  const path = new URL(request.url()).pathname;
  if (path === '/api/register' && request.method() === 'POST') {
    registrationPayload = request.postDataJSON();
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ user: { id: 991001, name: 'Seller Redirect Test', email: 'seller-redirect@example.com', role: 'individual', phone_verified: false, email_verified_at: '2026-07-15T00:00:00Z' }, access_token: 'e2e-registration-token' }) });
  }
  if (path === '/api/categories') return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  if (path === '/api/ads' || path.startsWith('/api/ads/')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, per_page: 16 }) });
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});

page.on('pageerror', (e) => console.log('[pageerror]', e.message.split('\n')[0]));
page.on('framenavigated', (f) => { if (f === page.mainFrame()) console.log('[navigated]', f.url()); });

console.log(`\n=== probe mode=${mode} ${vp.width}x${vp.height} cpu=${cpuRate}x settle=${settleMs}ms ===`);
const step = async (name, fn) => {
  const t = Date.now();
  try { await fn(); console.log(`  ok   ${name} (${Date.now() - t}ms)`); }
  catch (e) { console.log(`  FAIL ${name} (${Date.now() - t}ms): ${String(e.message).split('\n')[0].slice(0, 160)}`); throw e; }
};

try {
  await step('goto /post', () => page.goto(base + '/post', { waitUntil: 'domcontentloaded' }));
  await step('click Unete', () => page.getByRole('button', { name: 'No tienes cuenta? Únete' }).click({ timeout: 15000 }));
  const registrationForm = page.locator('form').filter({ has: page.locator('input[name="name"]') });
  await step('fill fields', async () => {
    await registrationForm.locator('input[name="name"]').fill('Seller Redirect Test');
    await registrationForm.locator('input[name="email"]').fill('seller-redirect@example.com');
    await registrationForm.locator('input[name="password"]').fill('SecurePass123!');
  });
  await step('check consent', () => registrationForm.locator('input[type="checkbox"]').check());
  await step('toBeChecked', () => registrationForm.locator('input[type="checkbox"]').waitFor({ state: 'attached' }));

  if (settleMs) {
    console.log(`  ... settling ${settleMs}ms (watching for silent remount / close)`);
    await new Promise(r => setTimeout(r, settleMs));
  }

  const deadline = Date.now() + 10000;
  let lastVal = null, lastErr = null, tries = 0, firstFalse = null;
  while (Date.now() < deadline) {
    tries++;
    try {
      lastVal = await registrationForm.evaluate((f) => f.checkValidity(), { timeout: 2500 });
      if (lastVal === false && firstFalse === null) firstFalse = Date.now();
      if (lastVal === true) break;
    } catch (e) { lastErr = String(e.message).split('\n')[0].slice(0, 100); }
    await new Promise(r => setTimeout(r, 250));
  }
  console.log(`  poll: tries=${tries} lastVal=${lastVal} lastErr=${lastErr}`);
  console.log('  final sample:', JSON.stringify(await page.evaluate(() => window.__sample())));
  if (lastVal !== true) {
    console.log('  >>> VERDICT: FAILED');
    try {
      const snap = await page.locator('body').ariaSnapshot({ timeout: 5000 });
      console.log('  >>> ARIA SNAPSHOT START\n' + snap.slice(0, 4000) + '\n  >>> ARIA SNAPSHOT END');
    } catch (e) { console.log('  >>> aria snapshot failed:', String(e.message).slice(0, 120)); }
  } else {
    console.log('  >>> VERDICT: PASSED');
  }
} catch (e) {
  console.log('  aborted:', String(e.message).split('\n')[0].slice(0, 200));
}

const fate = await page.evaluate(() => window.__fate).catch(() => []);
console.log(`\n--- timeline (${fate.length} events) ---`);
for (const e of fate) console.log(JSON.stringify(e));
console.log('--- end ---');
await b.close();
