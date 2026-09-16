import { test, expect } from '@playwright/test';

async function prepare(page, lang = 'es') {
  await page.addInitScript(language => {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('lang', language);
    localStorage.setItem('mercasto_language', language);
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('cookiesAccepted', 'true');
  }, lang);
  await page.route('**/api/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: [] }),
  }));
}

async function expectHiddenGlobalRail(page) {
  const metrics = await page.evaluate(() => {
    const webkit = getComputedStyle(document.documentElement, '::-webkit-scrollbar');
    return {
      display: webkit.display,
      width: webkit.width,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(metrics.display === 'none' || metrics.width === '0px').toBe(true);
  expect(metrics.overflow).toBeLessThanOrEqual(1);
}

test('mobile Golden Header stays compact while scrolling remains rail-free', async ({ page }) => {
  await prepare(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const header = page.getByTestId('golden-header');
  await expect(header).toBeVisible();
  await expect(page.locator('.site-header')).toBeHidden();
  const headerBox = await header.boundingBox();
  expect(headerBox.height).toBeLessThanOrEqual(60);
  await expect(page.getByTestId('golden-mobile-search-input')).toBeVisible();
  await expect(page.locator('.mcg-bottom-nav')).toBeVisible();
  await expectHiddenGlobalRail(page);

  const universalScroller = await page.evaluate(() => {
    const node = document.createElement('div');
    node.style.cssText = 'width:40px;height:20px;overflow:auto;position:absolute;left:-9999px;top:0';
    node.innerHTML = '<div style="height:100px;width:100px"></div>';
    document.querySelector('#root').appendChild(node);
    const before = node.scrollTop;
    node.scrollTop = 24;
    const style = getComputedStyle(node);
    const webkit = getComputedStyle(node, '::-webkit-scrollbar');
    const result = {
      before,
      after: node.scrollTop,
      scrollbarWidth: style.scrollbarWidth,
      webkitDisplay: webkit.display,
      webkitWidth: webkit.width,
    };
    node.remove();
    return result;
  });
  expect(universalScroller.after).toBeGreaterThan(universalScroller.before);
  expect(universalScroller.scrollbarWidth).toBe('none');
  expect(
    universalScroller.webkitDisplay === 'none' || universalScroller.webkitWidth === '0px',
  ).toBe(true);

  const rail = page.getByTestId('home-category-rail');
  await expect(rail).toBeVisible();
  const railMetrics = await rail.evaluate(node => {
    const before = node.scrollLeft;
    node.scrollLeft = Math.min(120, node.scrollWidth - node.clientWidth);
    return {
      before,
      after: node.scrollLeft,
      scrollable: node.scrollWidth > node.clientWidth,
      scrollbar: getComputedStyle(node).scrollbarWidth,
    };
  });
  expect(railMetrics.scrollable).toBe(true);
  expect(railMetrics.after).toBeGreaterThan(railMetrics.before);
  expect(railMetrics.scrollbar).toBe('none');
});

test('RTL category rail preserves direction and keeps hidden rails', async ({ page }) => {
  await prepare(page, 'ar');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe('rtl');

  const rail = page.getByTestId('home-category-rail');
  await expect(rail).toBeVisible();
  const mask = await rail.evaluate(node =>
    getComputedStyle(node).maskImage || getComputedStyle(node).webkitMaskImage);
  expect(mask).toMatch(/270deg/);
  expect(await rail.evaluate(node => getComputedStyle(node).scrollbarWidth)).toBe('none');
  await expectHiddenGlobalRail(page);
});

test('tablet Golden Header uses tablet search without the legacy category strip', async ({ page }) => {
  await prepare(page);
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const header = page.getByTestId('golden-header');
  const headerBox = await header.boundingBox();
  expect(headerBox.height).toBeLessThanOrEqual(74);
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(page.getByTestId('header-category-bar')).toBeHidden();
  await expect(page.getByTestId('golden-tablet-search-input')).toBeVisible();
  await expect(page.getByTestId('golden-language-select')).toBeVisible();
  await expect(page.getByTestId('golden-theme-toggle')).toBeVisible();
  await expectHiddenGlobalRail(page);
});

test('1024px breakpoint stays in the approved tablet shell without overflow', async ({ page }) => {
  await prepare(page);
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('golden-tablet-search-input')).toBeVisible();
  await expect(page.getByTestId('golden-desktop-search-input')).toBeHidden();
  await expect(page.getByTestId('golden-location-button')).toHaveAccessibleName(/.+/);
  await expect(page.locator('.mcg-bottom-nav')).toBeVisible();
  await expectHiddenGlobalRail(page);
});
