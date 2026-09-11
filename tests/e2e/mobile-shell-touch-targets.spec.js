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

    // The shell's mobile search row is absent on the Home V2 route, which owns
    // its own hero search, so it is asserted separately below on a route that
    // always renders it.
    const squareTargets = [
      page.getByTestId('mobile-theme-toggle'),
      page.getByTestId('mobile-language-select'),
      page.getByTestId('mobile-account-button'),
    ];

    for (const target of squareTargets) {
      const rect = await box(target);
      expect(rect.width).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(rect.height).toBeGreaterThanOrEqual(MIN_TARGET);
    }

    for (const target of [page.getByTestId('mobile-location-button')]) {
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

test('mobile search row keeps 48px targets on routes that render it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');

  await page.addInitScript(() => {
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('lang', 'en');
    localStorage.setItem('mercasto_language', 'en');
  });

  for (const width of MOBILE_WIDTHS) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/listings');
    await expect(page.getByTestId('mobile-header-search')).toBeVisible();

    for (const target of [page.getByTestId('mobile-search-submit'), page.getByTestId('mobile-search-input')]) {
      const rect = await box(target);
      expect(rect.width).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(rect.height).toBeGreaterThanOrEqual(MIN_TARGET);
    }
  }
});

test('cookie notice stays above the mobile tabbar', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');

  await page.addInitScript(() => {
    localStorage.removeItem('cookie_consent');
    localStorage.removeItem('cookiesAccepted');
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
  });

  for (const viewport of [
    { width: 390, height: 667 },
    { width: 390, height: 900 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const notice = page.getByRole('dialog', { name: 'Aviso de cookies' });
    const tabbar = page.locator('.mobile-tabbar');
    const noticeRect = await box(notice);
    const tabbarRect = await box(tabbar);

    expect(noticeRect.y + noticeRect.height).toBeLessThanOrEqual(tabbarRect.y + 1);
    expect(Math.abs(tabbarRect.y + tabbarRect.height - viewport.height)).toBeLessThanOrEqual(1);

    await notice.getByRole('button', { name: 'Solo esenciales' }).click();
    await expect(notice).toBeHidden();
    await page.evaluate(() => localStorage.removeItem('cookie_consent'));
  }
});


test('auth modal fits short mobile viewports, locks the page, and keeps 48px targets', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'));

  await page.addInitScript(() => {
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('lang', 'en');
    localStorage.setItem('mercasto_language', 'en');
  });

  for (const viewport of [
    { width: 390, height: 667 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/listings');
    await page.evaluate(() => window.scrollTo(0, 600));
    const backgroundScrollY = await page.evaluate(() => window.scrollY);

    await page.getByTestId('mobile-account-button').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const loginRect = await box(dialog);
    expect(loginRect.y).toBeGreaterThanOrEqual(0);
    expect(loginRect.y + loginRect.height).toBeLessThanOrEqual(viewport.height + 1);

    for (const target of [
      page.getByTestId('auth-modal-close'),
      dialog.locator('input[name="email"]'),
      dialog.locator('input[name="password"]'),
      page.getByTestId('auth-mode-switch'),
      page.getByTestId('auth-forgot-password'),
    ]) {
      const rect = await box(target);
      expect(rect.height).toBeGreaterThanOrEqual(MIN_TARGET);
    }

    const lockedOverflow = await page.evaluate(() => ({
      body: document.body.style.overflowY,
      root: document.documentElement.style.overflowY,
    }));
    expect(lockedOverflow).toEqual({ body: 'hidden', root: 'hidden' });
    if (!testInfo.project.name.includes('webkit')) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(50);
      expect(await page.evaluate(() => window.scrollY)).toBe(backgroundScrollY);
    }

    await page.getByTestId('auth-mode-switch').click();
    await expect(dialog.locator('input[name="name"]')).toBeVisible();

    const registerRect = await box(dialog);
    expect(registerRect.y).toBeGreaterThanOrEqual(0);
    expect(registerRect.y + registerRect.height).toBeLessThanOrEqual(viewport.height + 1);

    const dialogMetrics = await dialog.evaluate((node) => ({
      scrollbarWidth: getComputedStyle(node).scrollbarWidth,
      scrollHeight: node.scrollHeight,
      clientHeight: node.clientHeight,
    }));
    expect(dialogMetrics.scrollbarWidth).toBe('none');
    if (viewport.height === 667) {
      expect(dialogMetrics.scrollHeight).toBeGreaterThan(dialogMetrics.clientHeight);
    }

    for (const target of [
      dialog.locator('input[name="name"]'),
      dialog.locator('input[name="email"]'),
      dialog.locator('input[name="password"]'),
      dialog.locator('a[href="/terms"]'),
      dialog.locator('a[href="/privacy"]'),
      page.getByTestId('auth-mode-switch'),
    ]) {
      const rect = await box(target);
      expect(rect.height).toBeGreaterThanOrEqual(MIN_TARGET);
    }

    const consentLabelRect = await box(dialog.locator('label:has(input[name="age_confirmed"])'));
    expect(consentLabelRect.height).toBeGreaterThanOrEqual(MIN_TARGET);

    await dialog.evaluate((node) => node.scrollTo(0, node.scrollHeight));
    await expect(page.getByTestId('auth-mode-switch')).toBeVisible();
    await dialog.evaluate((node) => node.scrollTo(0, 0));

    await page.getByTestId('auth-modal-close').click();
    await expect(dialog).toBeHidden();

    const restoredOverflow = await page.evaluate(() => ({
      body: document.body.style.overflowY,
      root: document.documentElement.style.overflowY,
    }));
    expect(restoredOverflow.body).not.toBe('hidden');
    expect(restoredOverflow.root).not.toBe('hidden');
    if (!testInfo.project.name.includes('webkit')) {
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(50);
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(backgroundScrollY);
    }
  }
});
