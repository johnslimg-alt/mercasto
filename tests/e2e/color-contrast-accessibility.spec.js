import { test, expect } from '@playwright/test';

/**
 * WCAG colour-contrast gate (1.4.3 text, 1.4.11 non-text).
 *
 * Everything here is measured from the rendered page: computed colours plus the
 * effective background composited up the ancestor chain. A Tailwind class is
 * never taken as proof — the previous dark-mode border token read as "a border"
 * in source while rendering at 1.41:1.
 *
 * Covered:
 *   1. brand-coloured text (the greens used as text) meets 1.4.3 on whatever
 *      background it actually renders on — 4.5:1 normal, 3:1 large;
 *   2. dark-mode card/control boundaries meet 1.4.11 (>= 3:1) on the lightest
 *      dark surface in use (#1E293B);
 *   3. the icon-only brand controls (theme toggle, location button, active
 *      tabbar item) meet 1.4.11 in both themes.
 *
 * NOT covered (stated plainly, no silent gaps):
 *   - decorative icons and tinted decorative borders (e.g. `bg-[#84CC16]/10`
 *     pills, `border-white/10` hairlines): 1.4.11 does not apply to them;
 *   - hover / focus / disabled state colours (a resting-state audit cannot see
 *     them);
 *   - routes and authenticated surfaces outside ROUTES below;
 *   - text over gradients or photographic backgrounds (reported as
 *     `bgFromImage`, deliberately not asserted: the pixel under the glyph is
 *     not a single colour);
 *   - light-mode non-brand borders (out of scope for this change).
 */

const ROUTES = ['/', '/listings', '/motor', '/vendedores', '/inmuebles', '/empleos'];

// Every green this product uses for brand text/icons, including the accessible
// light-surface values introduced by this change — so a future regression that
// puts an accessible-on-white green on a dark surface is caught too.
const BRAND_TEXT_COLORS = [
  'rgb(132, 204, 22)', // #84CC16
  'rgb(101, 163, 13)', // #65A30D
  'rgb(77, 124, 15)',  // #4D7C0F
  'rgb(54, 83, 20)',   // #365314
];

const MEASURE = ({ routes, brandColors }) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const SENTINEL = '#ff00ff';

  function parse(value) {
    if (!value) return null;
    const s = String(value).trim();
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    const h = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (h) {
      const full = h[1].length === 3 ? h[1].split('').map((c) => c + c).join('') : h[1];
      return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16), a: 1 };
    }
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = SENTINEL;
    ctx.fillStyle = s;
    if (ctx.fillStyle === SENTINEL && !/magenta|fuchsia|#ff00ff/i.test(s)) return null;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    if (d[3] === 0) return null;
    return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
  }
  const key = (c) => `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const luminance = (c) => {
    const lin = (v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  };
  const ratio = (a, b) => {
    const la = luminance(a); const lb = luminance(b);
    const hi = Math.max(la, lb); const lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  };

  function effectiveBackground(el, skipSelf = false) {
    const stack = [];
    let node = skipSelf ? el.parentElement : el;
    let sawImage = false;
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') sawImage = true;
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) {
        stack.push(c);
        if (c.a >= 1) break;
      }
      node = node.parentElement;
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i -= 1) base = over(stack[i], base);
    return { color: base, sawImage };
  }

  function cssPath(el) {
    const parts = [];
    let node = el;
    let guard = 0;
    while (node && node.nodeType === 1 && guard < 4) {
      let part = node.tagName.toLowerCase();
      if (node.dataset && node.dataset.testid) { parts.unshift(`${part}[data-testid="${node.dataset.testid}"]`); break; }
      const cls = Array.from(node.classList || []).slice(0, 2).join('.');
      if (cls) part += `.${cls}`;
      parts.unshift(part);
      node = node.parentElement;
      guard += 1;
    }
    return parts.join(' > ');
  }

  const rendered = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
    if (Number(cs.opacity) === 0 || el.closest('[hidden]') || el.closest('[inert]')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const result = { route: window.location.pathname, dark: document.documentElement.classList.contains('dark'), text: [], borders: [], controls: [] };

  for (const el of document.querySelectorAll('*')) {
    if (!rendered(el)) continue;
    const cs = getComputedStyle(el);
    const isSvg = el.tagName.toLowerCase() === 'svg';

    // ---- 1. brand-coloured text (1.4.3) ----
    const ownText = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3 && n.nodeValue && n.nodeValue.trim())
      .map((n) => n.nodeValue.trim()).join(' ').slice(0, 50);
    if (ownText && !el.closest('svg')) {
      const color = parse(cs.color);
      if (color && brandColors.includes(key(color))) {
        const bg = effectiveBackground(el);
        const fontSize = parseFloat(cs.fontSize);
        const bold = Number(cs.fontWeight) >= 700;
        const isLarge = fontSize >= 24 || (fontSize >= 18.66 && bold);
        const threshold = isLarge ? 3 : 4.5;
        result.text.push({
          selector: cssPath(el),
          text: ownText,
          fg: hex(color),
          bg: hex(bg.color),
          bgFromImage: bg.sawImage,
          fontSize,
          threshold,
          ratio: Number(ratio(color, bg.color).toFixed(2)),
        });
      }
    }

    // ---- 2. dark-mode component boundaries (1.4.11) ----
    if (result.dark && !isSvg && !el.closest('.leaflet-container')) {
      const width = parseFloat(cs.borderTopWidth);
      const borderColor = parse(cs.borderTopColor);
      const classList = String(el.className || '');
      const isCard = /(^|\s)(market-card|mc-card|card|market-surface|market-shell|mc-control)(\s|$)/.test(classList);
      const isControl = el.matches('button, a[href], input, select, textarea, [role="button"]');
      // Opaque borders on cards/controls are component boundaries. Translucent
      // borders (border-white/10 dividers, /20 decorative pills) are excluded:
      // 1.4.11 does not apply to decorative hairlines.
      const isBoundary = width > 0 && borderColor && borderColor.a === 1 && (isCard || isControl);
      if (isBoundary) {
        const inside = effectiveBackground(el);
        const outside = effectiveBackground(el, true);
        const ratioIn = ratio(borderColor, inside.color);
        const ratioOut = ratio(borderColor, outside.color);
        result.borders.push({
          selector: cssPath(el),
          fg: hex(borderColor),
          inside: hex(inside.color),
          outside: hex(outside.color),
          ratio: Number(Math.max(ratioIn, ratioOut).toFixed(2)),
          ratioInside: Number(ratioIn.toFixed(2)),
          ratioOutside: Number(ratioOut.toFixed(2)),
          threshold: 3,
        });
      }
    }

    // ---- 3. icon-only brand controls (1.4.11) ----
    const control = el.matches('button, a[href], [role="button"]') ? el : null;
    if (control) {
      const text = (control.innerText || '').replace(/\s+/g, ' ').trim();
      const svg = control.querySelector('svg');
      if (!text && svg) {
        const color = parse(getComputedStyle(svg).color);
        if (color && brandColors.includes(key(color))) {
          const bg = effectiveBackground(svg);
          result.controls.push({
            selector: cssPath(control),
            label: control.getAttribute('aria-label') || '',
            fg: hex(color),
            bg: hex(bg.color),
            ratio: Number(ratio(color, bg.color).toFixed(2)),
            threshold: 3,
          });
        }
      }
    }
  }

  return { ...result, requestedRoutes: routes };
};

function describe(entries, key = 'ratio') {
  return entries.map((e) => `${e.selector} ${e.fg} on ${e.bg ?? e.inside} ${key}=${e.ratio} (needs ${e.threshold})`).join('\n');
}

async function prepare(page, { dark }) {
  await page.addInitScript((theme) => {
    localStorage.setItem('theme', theme);
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
  }, dark ? 'dark' : 'light');
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    let body = {};
    if (/\/ads$/.test(pathname)) {
      body = {
        data: Array.from({ length: 6 }, (_, i) => ({
          id: 81000 + i,
          title: `Anuncio de contraste ${i + 1}`,
          price: 2000 + i * 750,
          category: ['motor', 'inmuebles', 'empleos', 'servicios'][i % 4],
          condition: i % 2 ? 'nuevo' : 'usado',
          state: 'Jalisco',
          location: 'Guadalajara, Jalisco',
          image_url: '/placeholder-ad.svg',
          status: 'active',
          user: { id: 800 + i, name: 'QA Seller', role: i % 3 ? 'individual' : 'business' },
        })),
        total: 6, current_page: 1, last_page: 1,
      };
    } else if (/\/categories$/.test(pathname)) body = [{ id: 1, slug: 'motor', name: 'Motor' }];
    else if (/\/auth\/providers$/.test(pathname)) body = { google: false, apple: false, sms: false };
    else if (/(category-attributes|favorites|banners|suggestions|notifications)/.test(pathname)) body = [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function settle(page) {
  await expect(page.getByTestId('mobile-header-search').or(page.locator('header')).first()).toBeVisible();
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y <= Math.min(document.documentElement.scrollHeight, 9000); y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 35));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 120));
  });
  await page.waitForTimeout(250);
}

for (const theme of ['light', 'dark']) {
  test.describe(`${theme} theme contrast`, () => {
    for (const route of ROUTES) {
      test(`brand text meets WCAG 1.4.3 on ${route}`, async ({ page }) => {
        await prepare(page, { dark: theme === 'dark' });
        await page.goto(route);
        await settle(page);
        const result = await page.evaluate(MEASURE, { routes: ROUTES, brandColors: BRAND_TEXT_COLORS });
        const failures = result.text.filter((entry) => entry.ratio < entry.threshold - 0.005);
        expect(
          failures,
          `${theme} ${route}: brand-coloured text below its WCAG 1.4.3 threshold\n${describe(failures)}`,
        ).toEqual([]);
      });
    }

    test('dark-mode card and control boundaries meet WCAG 1.4.11', async ({ page }) => {
      test.skip(theme !== 'dark', 'boundary rule is dark-mode specific');
      for (const route of ROUTES) {
        await prepare(page, { dark: true });
        await page.goto(route);
        await settle(page);
        const result = await page.evaluate(MEASURE, { routes: ROUTES, brandColors: BRAND_TEXT_COLORS });
        expect(result.dark, `${route} should render in dark mode`).toBe(true);
        expect(result.borders.length, `${route} should expose card/control boundaries`).toBeGreaterThan(3);
        const failures = result.borders.filter((entry) => entry.ratio < entry.threshold - 0.005);
        expect(
          failures,
          `${route}: dark-mode boundaries below 3:1\n${describe(failures)}`,
        ).toEqual([]);
      }
    });

    test('icon-only brand controls meet WCAG 1.4.11', async ({ page }) => {
      // 390px is where the location control loses its text label and becomes an
      // icon-only target, i.e. the case 1.4.11 governs.
      await page.setViewportSize({ width: 390, height: 844 });
      await prepare(page, { dark: theme === 'dark' });
      await page.goto('/');
      await settle(page);
      const result = await page.evaluate(MEASURE, { routes: ROUTES, brandColors: BRAND_TEXT_COLORS });
      const labels = result.controls.map((c) => c.label).filter(Boolean);
      expect(labels, `expected icon-only controls to be measured (${theme})`).toEqual(
        expect.arrayContaining([
          theme === 'dark' ? 'Modo claro' : 'Modo oscuro',
          'Cambiar ubicación: Todo México',
          'Inicio',
        ]),
      );
      const failures = result.controls.filter((entry) => entry.ratio < entry.threshold - 0.005);
      expect(failures, `${theme}: icon-only controls below 3:1\n${describe(failures)}`).toEqual([]);
    });
  });
}

test('pricing modal brand text stays readable on the modal surfaces', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'modal layout is mobile-critical');

  for (const dark of [false, true]) {
    await prepare(page, { dark });
    await page.goto('/');
    await settle(page);
    const trigger = page.locator("button:has-text('Ver planes')").first();
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.locator('h4:has-text("Impulso")')).toBeVisible();

    const result = await page.evaluate(MEASURE, { routes: ROUTES, brandColors: BRAND_TEXT_COLORS });
    const modalEntries = result.text.filter((entry) => /Impulso|Negocio|Plan Actual|Planes mensuales|Destacados|Particular|PRO/i.test(entry.text));
    expect(modalEntries.length, `pricing modal plan labels should be measured (dark=${dark})`).toBeGreaterThan(1);
    const failures = result.text.filter((entry) => entry.ratio < entry.threshold - 0.005);
    expect(
      failures,
      `pricing modal (dark=${dark}): brand text below its 1.4.3 threshold\n${describe(failures)}`,
    ).toEqual([]);
  }
});
