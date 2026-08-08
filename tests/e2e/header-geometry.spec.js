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
