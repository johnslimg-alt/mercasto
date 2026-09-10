import { test, expect } from '@playwright/test';

test('mobile header stays compact and scroll rails stay hidden', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);

  const header = page.locator('.site-header');
  await expect(header).toBeVisible();
  const headerBox = await header.boundingBox();
  expect(headerBox.height).toBeLessThanOrEqual(130);
  await expect(page.getByTestId('header-category-bar')).toBeHidden();

  const metrics = await page.evaluate(() => {
    const webkitScrollbar = getComputedStyle(document.documentElement, '::-webkit-scrollbar');
    return {
      webkitScrollbarDisplay: webkitScrollbar.display,
      webkitScrollbarWidth: webkitScrollbar.width,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(metrics.webkitScrollbarDisplay === 'none' || metrics.webkitScrollbarWidth === '0px').toBe(true);
  expect(metrics.overflow).toBeLessThanOrEqual(1);

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
  expect(universalScroller.webkitDisplay === 'none' || universalScroller.webkitWidth === '0px').toBe(true);

  const rail = page.getByTestId('home-category-rail');
  await expect(rail).toBeVisible();
  const firstCategory = rail.locator('.category-pill').first();
  const [railBox, firstBox] = await Promise.all([rail.boundingBox(), firstCategory.boundingBox()]);
  expect(firstBox.x).toBeGreaterThanOrEqual(railBox.x - 1);
  expect(firstBox.x + firstBox.width).toBeLessThanOrEqual(railBox.x + railBox.width + 1);
  const mask = await rail.evaluate((node) => getComputedStyle(node).maskImage || getComputedStyle(node).webkitMaskImage);
  expect(mask).not.toMatch(/transparent[^,]*,\s*(?:rgb\(0, 0, 0\)|black)/i);

  const railMetrics = await rail.evaluate((node) => {
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

  await rail.evaluate((node) => { node.scrollLeft = node.scrollWidth; });
  const lastCategory = rail.locator('.category-pill').last();
  const [endRailBox, lastBox] = await Promise.all([rail.boundingBox(), lastCategory.boundingBox()]);
  expect(lastBox.x).toBeGreaterThanOrEqual(endRailBox.x - 1);
  expect(lastBox.x + lastBox.width).toBeLessThanOrEqual(endRailBox.x + endRailBox.width - 20);
});


test('RTL home category rail mirrors the trailing fade without obscuring the first item', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'ar');
    localStorage.setItem('mercasto_language', 'ar');
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe('rtl');

  const rail = page.getByTestId('home-category-rail');
  await expect(rail).toBeVisible();
  const firstCategory = rail.locator('.category-pill').first();
  const [railBox, firstBox] = await Promise.all([rail.boundingBox(), firstCategory.boundingBox()]);
  expect(firstBox.x).toBeGreaterThanOrEqual(railBox.x - 1);
  expect(firstBox.x + firstBox.width).toBeLessThanOrEqual(railBox.x + railBox.width + 1);

  const mask = await rail.evaluate((node) => getComputedStyle(node).maskImage || getComputedStyle(node).webkitMaskImage);
  expect(mask).toMatch(/270deg/);
});

test('desktop header preserves search width at the 1024px breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);

  const headerBox = await page.locator('.site-header').boundingBox();
  const searchBox = await page.getByTestId('desktop-header-search').boundingBox();
  const locationButton = page.getByTestId('desktop-location-button');
  expect(headerBox.height).toBeLessThanOrEqual(105);
  expect(searchBox.width).toBeGreaterThanOrEqual(280);
  await expect(locationButton).toHaveAccessibleName(/.+/);

  const metrics = await page.evaluate(() => {
    const webkitScrollbar = getComputedStyle(document.documentElement, '::-webkit-scrollbar');
    return {
      webkitScrollbarDisplay: webkitScrollbar.display,
      webkitScrollbarWidth: webkitScrollbar.width,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(metrics.webkitScrollbarDisplay === 'none' || metrics.webkitScrollbarWidth === '0px').toBe(true);
  expect(metrics.overflow).toBeLessThanOrEqual(1);
});


test('tablet header avoids the redundant category strip', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);

  const headerBox = await page.locator('.site-header').boundingBox();
  expect(headerBox.height).toBeLessThanOrEqual(125);
  await expect(page.getByTestId('header-category-bar')).toBeHidden();
  await expect(page.getByTestId('mobile-header-search')).toBeVisible();
});
