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

  const metrics = await page.evaluate(() => ({
    documentScrollbar: getComputedStyle(document.documentElement).scrollbarWidth,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(metrics.documentScrollbar).toBe('none');
  expect(metrics.overflow).toBeLessThanOrEqual(1);

  const rail = page.getByTestId('home-category-rail');
  await expect(rail).toBeVisible();
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
});

test('desktop header preserves search width at the 1024px breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);

  const headerBox = await page.locator('.site-header').boundingBox();
  const searchBox = await page.getByTestId('desktop-header-search').boundingBox();
  expect(headerBox.height).toBeLessThanOrEqual(105);
  expect(searchBox.width).toBeGreaterThanOrEqual(280);

  const metrics = await page.evaluate(() => ({
    documentScrollbar: getComputedStyle(document.documentElement).scrollbarWidth,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(metrics.documentScrollbar).toBe('none');
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
