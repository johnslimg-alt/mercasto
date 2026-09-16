import { test, expect } from '@playwright/test';

const DESKTOP_WIDTHS = [1440, 1920];

async function prepare(page) {
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'light');
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('cookiesAccepted', 'true');
  });
  await page.route('**/api/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: [] }),
  }));
}

test.beforeEach(async ({ page }) => {
  await prepare(page);
});

test('desktop Golden Header keeps the approved single-row geometry', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');

  for (const width of DESKTOP_WIDTHS) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const header = page.getByTestId('golden-header');
    await expect(header).toBeVisible();
    await expect(page.locator('.site-header')).toBeHidden();
    await expect(header.locator('input')).toHaveCount(0);
    await expect(page.getByTestId('golden-desktop-search-input')).toBeVisible();

    const headerBox = await header.boundingBox();
    expect(headerBox.height).toBeCloseTo(70, 0);
    expect(headerBox.x).toBeCloseTo(0, 0);
    expect(headerBox.width).toBeCloseTo(width, 0);

    const [brand, location, language, theme, account] = await Promise.all([
      header.locator('.mcg-brand').boundingBox(),
      page.getByTestId('golden-location-button').boundingBox(),
      page.getByTestId('golden-language-select').locator('..').boundingBox(),
      page.getByTestId('golden-theme-toggle').boundingBox(),
      page.getByTestId('golden-account-button').boundingBox(),
    ]);
    for (const box of [brand, location, language, theme, account]) {
      expect(box).not.toBeNull();
      expect(box.y).toBeGreaterThanOrEqual(headerBox.y);
      expect(box.y + box.height).toBeLessThanOrEqual(headerBox.y + headerBox.height + 1);
    }

    const brandRight = brand.x + brand.width;
    expect(location.x).toBeGreaterThanOrEqual(brandRight - 1);
    expect(location.x - brandRight).toBeLessThanOrEqual(24);

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});

test('Golden Header language selector has a visible keyboard focus indicator', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const language = page.getByTestId('golden-language-select');
  await language.focus();
  await expect(language).toBeFocused();

  const focusStyle = await language.evaluate(element => {
    const wrapper = element.closest('.mcg-lang');
    const style = getComputedStyle(wrapper);
    return {
      outlineColor: style.outlineColor,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });
  expect(focusStyle.outlineColor).toBe('rgb(132, 204, 22)');
  expect(parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(2);
  expect(focusStyle.boxShadow).not.toBe('none');

  await language.selectOption('en');
  await expect(language).toHaveValue('en');
});

test('Golden Header guest account control is named and keyboard operable', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const account = page.getByTestId('golden-account-button');
  await expect(account).toBeVisible();
  await expect(account).toHaveAccessibleName(/.+/);
  await account.focus();
  await expect(account).toBeFocused();

  const style = await account.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const css = getComputedStyle(element);
    return {
      width: rect.width,
      height: rect.height,
      outlineWidth: css.outlineWidth,
      outlineColor: css.outlineColor,
    };
  });
  expect(Math.abs(style.width - style.height)).toBeLessThanOrEqual(2);
  expect(parseFloat(style.outlineWidth)).toBeGreaterThanOrEqual(2);
  expect(style.outlineColor).toBe('rgb(132, 204, 22)');

  await account.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
});
