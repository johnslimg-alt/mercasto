import { test, expect } from '@playwright/test';

const DESKTOP_WIDTHS = [1440, 1920];

test('desktop header controls share one geometry system', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');

  for (const width of DESKTOP_WIDTHS) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.getByTestId('desktop-header-row')).toBeVisible();
    await page.waitForTimeout(250);

    const metrics = await page.locator('.desktop-header-row .desktop-header-control:visible').evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          height: rect.height,
          top: rect.top,
          bottom: rect.bottom,
          radius: style.borderRadius,
        };
      }),
    );

    expect(metrics.length).toBeGreaterThanOrEqual(9);
    for (const metric of metrics) {
      expect(metric.height).toBeCloseTo(44, 0);
      expect(metric.radius).toBe('14px');
      expect(metric.top).toBeGreaterThanOrEqual(0);
    }

    const row = await page.getByTestId('desktop-header-row').boundingBox();
    const search = await page.getByTestId('desktop-header-search').boundingBox();
    const submit = await page.getByTestId('desktop-search-submit').boundingBox();
    expect(row).not.toBeNull();
    expect(search).not.toBeNull();
    expect(submit).not.toBeNull();
    expect(search.y).toBeGreaterThanOrEqual(row.y);
    expect(search.y + search.height).toBeLessThanOrEqual(row.y + row.height);
    expect(submit.height).toBeCloseTo(36, 0);
  }
});

test('desktop language selector exposes a visible keyboard focus indicator', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByTestId('desktop-header-row')).toBeVisible();

  const languageSelect = page.getByTestId('desktop-language-select');
  await expect(languageSelect).toBeVisible();

  for (let index = 0; index < 20; index += 1) {
    if (await languageSelect.evaluate((element) => document.activeElement === element)) break;
    await page.keyboard.press('Tab');
  }

  await expect(languageSelect).toBeFocused();
  const focusStyle = await languageSelect.evaluate((element) => {
    const wrapper = element.closest('.header-lang-select');
    if (!wrapper) return null;
    const style = getComputedStyle(wrapper);
    return {
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
    };
  });

  expect(focusStyle).not.toBeNull();
  expect(focusStyle.borderColor).toBe('rgb(132, 204, 22)');
  expect(focusStyle.boxShadow).not.toBe('none');

  await languageSelect.selectOption('en');
  await expect(languageSelect).toHaveValue('en');
});
