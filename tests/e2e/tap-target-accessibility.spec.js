import { test, expect } from '@playwright/test';

/**
 * WCAG 2.5.8 "Target Size (Minimum)" (Level AA) — behavioural gate.
 *
 * Every pointer target on the highest-traffic mobile routes must render at least
 * 24 x 24 CSS px, or qualify for one of the two exceptions that actually apply
 * here, both implemented below:
 *
 *   Inline  — a target genuinely inline-flow inside a text block. Decided by
 *             geometry, never by "it is an <a>": the element must compute to
 *             display:inline, be line-constrained, and share a line box with
 *             non-target text of the same block.
 *   Spacing — an undersized target passes when a 24 CSS px diameter circle
 *             centred on its box does not intersect another target, nor the
 *             circle of another undersized target (WCAG 2.5.8 and Understanding
 *             figs. 7/9/10). Ancestor/descendant pairs are one control region.
 *
 * The final assertions pin the specific controls that this change hardened, so a
 * regression is reported as a measurement ("296x21") and not as a CSS class.
 */

const MIN_TARGET = 24;
const ROUTES = ['/', '/listings', '/motor', '/inmuebles', '/empleos', '/servicios'];

const INTERACTIVE_SELECTOR = 'a[href], button, input, select, textarea, [role="button"], [tabindex]';

const ADS = Array.from({ length: 10 }, (_, i) => ({
  id: 71000 + i,
  title: `Anuncio de prueba ${i + 1}`,
  price: 1500 + i * 500,
  category: ['motor', 'inmuebles', 'empleos', 'servicios'][i % 4],
  condition: i % 2 === 0 ? 'usado' : 'nuevo',
  state: 'Jalisco',
  location: 'Guadalajara, Jalisco',
  image_url: '/placeholder-ad.svg',
  status: 'active',
  user: { id: 700 + i, name: 'QA Seller', role: i % 3 === 0 ? 'business' : 'individual' },
}));

async function prepare(page) {
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
  });
  await page.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    let body = {};
    if (/\/ads$/.test(pathname)) body = { data: ADS, total: ADS.length, current_page: 1, last_page: 1 };
    else if (/\/categories$/.test(pathname)) body = [{ id: 1, slug: 'motor', name: 'Motor' }];
    else if (/\/auth\/providers$/.test(pathname)) body = { google: false, apple: false, sms: false };
    else if (/(category-attributes|favorites|banners|suggestions|notifications)/.test(pathname)) body = [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function settle(page) {
  await expect(page.getByTestId('mobile-header-search')).toBeVisible();
  // Trigger lazy sections, then come back to the top so measurements are taken
  // from the same scroll position the audit tool uses.
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    const max = Math.min(document.documentElement.scrollHeight, 12000);
    for (let y = 0; y <= max; y += step) {
      window.scrollTo(0, y);
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    window.scrollTo(0, 0);
    await new Promise(resolve => setTimeout(resolve, 120));
  });
  await page.waitForTimeout(300);
}

/** Enumerates every pointer target and applies the WCAG 2.5.8 exceptions. */
function auditTapTargets({ selector, minTarget }) {
  const radius = minTarget / 2;
  const epsilon = 0.01;
  const doc = document.documentElement;

  function cssPath(el) {
    const parts = [];
    let node = el;
    let guard = 0;
    while (node && node.nodeType === 1 && guard < 5) {
      let part = node.tagName.toLowerCase();
      if (node.dataset && node.dataset.testid) {
        parts.unshift(`${part}[data-testid="${node.dataset.testid}"]`);
        break;
      }
      const cls = Array.from(node.classList || []).slice(0, 2).join('.');
      if (cls) part += `.${cls}`;
      parts.unshift(part);
      node = node.parentElement;
      guard += 1;
    }
    return parts.join(' > ');
  }

  function label(el) {
    return (
      el.getAttribute('aria-label')
      || el.getAttribute('title')
      || el.getAttribute('placeholder')
      || (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40)
      || el.getAttribute('name')
      || ''
    );
  }

  function fullyClipped(el) {
    const raw = el.getBoundingClientRect();
    let rect = raw;
    const fixed = getComputedStyle(el).position === 'fixed';
    let node = el.parentElement;
    while (node && node !== document.body && node !== document.documentElement) {
      const style = getComputedStyle(node);
      const clips = ['hidden', 'clip'].includes(style.overflowX) || ['hidden', 'clip'].includes(style.overflowY);
      if (clips) {
        const establishesContainingBlock = style.transform !== 'none' || style.filter !== 'none' || style.perspective !== 'none';
        if (!fixed || establishesContainingBlock) {
          const outer = node.getBoundingClientRect();
          const x1 = Math.max(rect.left, outer.left);
          const y1 = Math.max(rect.top, outer.top);
          const x2 = Math.min(rect.right, outer.right);
          const y2 = Math.min(rect.bottom, outer.bottom);
          if (x2 - x1 <= 0 || y2 - y1 <= 0) return true;
          rect = { left: x1, top: y1, right: x2, bottom: y2, width: x2 - x1, height: y2 - y1 };
        }
      }
      node = node.parentElement;
    }
    return false;
  }

  function inlineExempt(el, rect) {
    if (getComputedStyle(el).display !== 'inline') return false;
    let block = el.parentElement;
    let hops = 0;
    while (block && hops < 8) {
      const display = getComputedStyle(block).display;
      if (!['inline', 'contents', 'inline-block', 'ruby', 'ruby-text'].includes(display)) break;
      block = block.parentElement;
      hops += 1;
    }
    if (!block || block === document.body || block === doc) return false;
    const blockStyle = getComputedStyle(block);
    const fontSize = parseFloat(blockStyle.fontSize) || 16;
    const lineHeight = blockStyle.lineHeight === 'normal' ? fontSize * 1.2 : parseFloat(blockStyle.lineHeight);
    if (Number.isFinite(lineHeight) && rect.height > lineHeight * 1.6 + 2) return false;

    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || el.contains(parent)) return NodeFilter.FILTER_REJECT;
        const style = getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let node;
    while ((node = walker.nextNode())) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const textRect of range.getClientRects()) {
        if (textRect.width <= 0 || textRect.height <= 0) continue;
        const overlap = Math.min(rect.bottom, textRect.bottom) - Math.max(rect.top, textRect.top);
        if (overlap >= Math.min(rect.height, textRect.height) * 0.5) return true;
      }
    }
    return false;
  }

  const targets = [];
  for (const el of document.querySelectorAll(selector)) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') continue;
    if (el.closest('[hidden]') || el.closest('[inert]')) continue;
    if (style.pointerEvents === 'none') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    if (fullyClipped(el)) continue;
    if (rect.right < -1 || rect.left > doc.scrollWidth + 1 || rect.bottom < -1 || rect.top > doc.scrollHeight + 1) continue;
    targets.push({
      el,
      selector: cssPath(el),
      label: label(el),
      box: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
      underSized: rect.width < minTarget - epsilon || rect.height < minTarget - epsilon,
      inlineExempt: rect.width < minTarget - epsilon || rect.height < minTarget - epsilon ? inlineExempt(el, rect) : false,
    });
  }

  for (let i = 0; i < targets.length; i += 1) {
    targets[i].ancestors = [];
    for (let j = 0; j < targets.length; j += 1) {
      if (i !== j && targets[j].el.contains(targets[i].el)) targets[i].ancestors.push(j);
    }
  }

  const circle = target => ({ cx: target.box.x + target.box.w / 2, cy: target.box.y + target.box.h / 2, r: radius });

  function reachesNeighbour(target, other) {
    const a = circle(target);
    const box = other.box;
    const points = [[a.cx, a.cy]];
    for (let k = 0; k < 8; k += 1) {
      const angle = (Math.PI * 2 * k) / 8;
      points.push([a.cx + Math.cos(angle) * (a.r - 0.5), a.cy + Math.sin(angle) * (a.r - 0.5)]);
    }
    let insideBox = false;
    let testable = false;
    for (const [x, y] of points) {
      if (x < box.x || x > box.x + box.w || y < box.y || y > box.y + box.h) continue;
      insideBox = true;
      if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) continue;
      testable = true;
      const hit = document.elementFromPoint(x, y);
      if (hit && (hit === other.el || other.el.contains(hit))) return true;
    }
    if (!insideBox) return false;
    return !testable; // off-screen neighbour: keep the conservative geometric answer
  }

  const failures = [];
  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i];
    if (!target.underSized || target.inlineExempt) continue;
    const a = circle(target);
    for (let j = 0; j < targets.length; j += 1) {
      if (i === j) continue;
      const other = targets[j];
      if (target.ancestors.includes(j) || other.ancestors.includes(i)) continue;
      const nearestX = Math.max(other.box.x, Math.min(a.cx, other.box.x + other.box.w));
      const nearestY = Math.max(other.box.y, Math.min(a.cy, other.box.y + other.box.h));
      const boxDistance = Math.hypot(a.cx - nearestX, a.cy - nearestY);
      const circleDistance = other.underSized
        ? Math.hypot(a.cx - circle(other).cx, a.cy - circle(other).cy)
        : Infinity;
      const hits = (boxDistance < radius - epsilon && reachesNeighbour(target, other))
        || (circleDistance < minTarget - epsilon && reachesNeighbour(target, other));
      if (hits) {
        failures.push({
          selector: target.selector,
          label: target.label,
          size: `${target.box.w.toFixed(1)}x${target.box.h.toFixed(1)}`,
          at: `${target.box.x.toFixed(0)},${target.box.y.toFixed(0)}`,
          hit: other.selector,
        });
        break;
      }
    }
  }

  return {
    total: targets.length,
    underSized: targets.filter(target => target.underSized).length,
    inlineExempt: targets.filter(target => target.underSized && target.inlineExempt).length,
    overflow: doc.scrollWidth - doc.clientWidth,
    failures,
  };
}

function describe(failures) {
  return failures
    .map(failure => `${failure.label || '(no name)'} ${failure.size} @${failure.at} [${failure.selector}] hits ${failure.hit}`)
    .join('\n');
}

test.describe('WCAG 2.5.8 target size (AA) on high-traffic mobile routes', () => {
  for (const route of ROUTES) {
    test(`no target under ${MIN_TARGET}x${MIN_TARGET} survives the exceptions on ${route}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-mobile');

      await prepare(page);
      await page.goto(route);
      await settle(page);

      const result = await page.evaluate(auditTapTargets, { selector: INTERACTIVE_SELECTOR, minTarget: MIN_TARGET });
      expect(result.total, `${route} should expose interactive targets`).toBeGreaterThan(10);
      expect(
        result.failures,
        `${route} WCAG 2.5.8 failures (${result.underSized} undersized, ${result.inlineExempt} inline-exempt):\n${describe(result.failures)}`,
      ).toEqual([]);
      expect(result.overflow, `${route} must not scroll horizontally`).toBeLessThanOrEqual(1);
    });
  }

  test('hero search field and location selects measure at least 24px tall', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile');

    await prepare(page);
    for (const viewport of [{ width: 390, height: 844 }, { width: 412, height: 915 }]) {
      await page.setViewportSize(viewport);
      await page.goto('/motor');
      await settle(page);
      const form = page.getByTestId('vertical-hero-search-form');
      for (const control of [form.locator('input'), form.locator('select').first(), form.locator('select').last()]) {
        await expect(control).toBeVisible();
        const box = await control.boundingBox();
        expect(box.height, `${viewport.width}px hero control height`).toBeGreaterThanOrEqual(MIN_TARGET);
        expect(box.width, `${viewport.width}px hero control width`).toBeGreaterThanOrEqual(MIN_TARGET);
      }
    }
  });

  test('footer navigation and home "see all" controls measure at least 24px without inflating the layout', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile');

    await prepare(page);
    await page.goto('/');
    await settle(page);

    const footer = page.locator('footer');

    for (const control of [
      footer.locator('ul li a').first(),
      footer.locator('ul li button').first(),
      footer.locator('a[href="/cookies"]'),
    ]) {
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box.height, `footer control height for "${(await control.innerText()).trim()}"`).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(box.width, `footer control width for "${(await control.innerText()).trim()}"`).toBeGreaterThanOrEqual(MIN_TARGET);
    }

    for (const link of await page.locator('.home-see-all').all()) {
      const box = await link.boundingBox();
      expect(box.height, `home see-all height for "${(await link.innerText()).trim()}"`).toBeGreaterThanOrEqual(MIN_TARGET);
    }

    // The 24px hit areas must not inflate the footer: rows keep their original
    // ~27.5px rhythm (a plain min-height would push them to 32px).
    const rowTops = await footer.locator('ul').first().locator('li').evaluateAll(elements =>
      elements.map(element => element.getBoundingClientRect().top));
    if (rowTops.length > 1) {
      for (let i = 1; i < rowTops.length; i += 1) {
        expect(rowTops[i] - rowTops[i - 1], `footer row ${i} pitch`).toBeLessThanOrEqual(30);
      }
    }
  });
});
