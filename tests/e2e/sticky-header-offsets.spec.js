import { expect, test } from '@playwright/test';

const PUBLIC_STICKY_ROUTES = [
  '/listings',
  '/motor',
  '/inmuebles',
  '/empleos',
  '/turismo',
  '/terminos',
  '/privacidad',
  '/cookies',
  '/contacto',
  '/ayuda',
];

async function acceptCookies(page) {
  await page.addInitScript(() => {
    localStorage.setItem('cookiesAccepted', 'true');
  });
}

async function documentStickyMetrics(page) {
  return page.evaluate(() => {
    const header = [...document.querySelectorAll('[data-testid="golden-header"], .site-header')]
      .find((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      });
    const headerStyle = header ? getComputedStyle(header) : null;
    const headerHeight = header?.getBoundingClientRect().height || 0;
    const headerOffset = headerStyle && ['sticky', 'fixed'].includes(headerStyle.position) ? headerHeight : 0;

    const nearestScrollAncestor = (element) => {
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const style = getComputedStyle(parent);
        if (['auto', 'scroll', 'hidden'].includes(style.overflowY)) return parent;
        parent = parent.parentElement;
      }
      return null;
    };

    const stickies = [...document.querySelectorAll('.sticky')]
      .filter((element) => !element.classList.contains('site-header'))
      .filter((element) => element.getAttribute('data-testid') !== 'golden-header')
      .filter((element) => !nearestScrollAncestor(element))
      .map((element) => ({
        top: Number.parseFloat(getComputedStyle(element).top),
        text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
      }))
      .filter(({ top }) => Number.isFinite(top));

    return {
      headerHeight,
      headerOffset,
      headerPosition: headerStyle?.position || '',
      stickies,
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
    };
  });
}

test('site header remains sticky without reintroducing horizontal overflow', async ({ page }) => {
  await acceptCookies(page);
  await page.setViewportSize({ width: 768, height: 844 });
  await page.goto('/motor', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(100);

  const header = page.locator('[data-testid="golden-header"]:visible, .site-header:visible').first();
  await expect(header).toBeVisible();
  const headerPosition = await header.evaluate((element) => getComputedStyle(element).position);
  if (['sticky', 'fixed'].includes(headerPosition)) {
    const box = await header.boundingBox();
    expect(Math.abs(box.y)).toBeLessThanOrEqual(1);
  }

  const metrics = await documentStickyMetrics(page);
  expect(metrics.documentOverflow).toBeLessThanOrEqual(1);
  expect(metrics.bodyOverflow).toBeLessThanOrEqual(1);
});

for (const width of [390, 768, 1024]) {
  test(`document sticky surfaces clear the site header at ${width}px`, async ({ page }) => {
    await acceptCookies(page);
    await page.setViewportSize({ width, height: 844 });

    for (const route of PUBLIC_STICKY_ROUTES) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const header = page.locator('[data-testid="golden-header"]:visible, .site-header:visible').first();
      await expect(header).toBeVisible();
      await page.waitForTimeout(180);

      const metrics = await documentStickyMetrics(page);
      expect(metrics.headerHeight, `${route} header height`).toBeGreaterThan(0);
      expect(metrics.documentOverflow, `${route} document overflow`).toBeLessThanOrEqual(1);
      expect(metrics.bodyOverflow, `${route} body overflow`).toBeLessThanOrEqual(1);

      for (const sticky of metrics.stickies) {
        expect(
          sticky.top,
          `${route} sticky "${sticky.text}" starts above ${metrics.headerOffset}px sticky-header offset`,
        ).toBeGreaterThanOrEqual(metrics.headerOffset - 1);
      }
    }
  });
}
