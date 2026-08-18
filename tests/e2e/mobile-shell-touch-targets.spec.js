import { test, expect } from '@playwright/test';

const MOBILE_WIDTHS = [360, 390, 430];
const MIN_TARGET = 48;

async function box(locator) {
  await expect(locator).toBeVisible();
  const value = await locator.boundingBox();
  expect(value).not.toBeNull();
  return value;
}

test('mobile shell keeps primary controls at 48px without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');

  await page.addInitScript(() => {
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('lang', 'en');
    localStorage.setItem('mercasto_language', 'en');
  });

  for (const width of MOBILE_WIDTHS) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await expect(page.getByTestId('mobile-header-search')).toBeVisible();

    const squareTargets = [
      page.getByTestId('mobile-theme-toggle'),
      page.getByTestId('mobile-language-select'),
      page.getByTestId('mobile-account-button'),
      page.getByTestId('mobile-search-submit'),
    ];

    for (const target of squareTargets) {
      const rect = await box(target);
      expect(rect.width).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(rect.height).toBeGreaterThanOrEqual(MIN_TARGET);
    }

    for (const target of [page.getByTestId('mobile-location-button'), page.getByTestId('mobile-search-input')]) {
      const rect = await box(target);
      expect(rect.height).toBeGreaterThanOrEqual(MIN_TARGET);
    }

    const tabButtons = page.locator('.mobile-tabbar > button');
    await expect(tabButtons).toHaveCount(5);
    for (let index = 0; index < 5; index += 1) {
      const rect = await box(tabButtons.nth(index));
      expect(rect.width).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(rect.height).toBeGreaterThanOrEqual(MIN_TARGET);
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
