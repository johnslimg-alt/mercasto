import { test, expect } from '@playwright/test';

test('catalog map follows untouched breakpoint defaults', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/listings');

  await expect(page.getByTestId('catalog-map-toggle')).toContainText('Ocultar mapa');
  await expect(page.getByTestId('catalog-map-shell')).toHaveCSS('height', '360px');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('catalog-map-toggle')).toContainText('Abrir mapa');
  await expect(page.getByTestId('catalog-map-shell')).toHaveCSS('height', '60px');

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByTestId('catalog-map-toggle')).toContainText('Ocultar mapa');
  await expect(page.getByTestId('catalog-map-shell')).toHaveCSS('height', '360px');
});

test('catalog map preserves an explicit user collapse choice across resize', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/listings');

  await page.getByTestId('catalog-map-toggle').click();
  await expect(page.getByTestId('catalog-map-toggle')).toContainText('Abrir mapa');
  await expect(page.getByTestId('catalog-map-shell')).toHaveCSS('height', '60px');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('catalog-map-toggle')).toContainText('Abrir mapa');

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByTestId('catalog-map-toggle')).toContainText('Abrir mapa');
  await expect(page.getByTestId('catalog-map-shell')).toHaveCSS('height', '60px');
});

test('mobile catalog primary toolbar controls keep 48px hit targets without overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');

  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/listings');

    for (const testId of [
      'catalog-mobile-filters',
      'catalog-map-toggle',
      'catalog-grid-view',
      'catalog-list-view',
    ]) {
      const control = page.getByTestId(testId);
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box?.height, `${testId} at ${width}px`).toBeGreaterThanOrEqual(48);
      expect(box?.x, `${testId} left edge at ${width}px`).toBeGreaterThanOrEqual(0);
      expect((box?.x || 0) + (box?.width || 0), `${testId} right edge at ${width}px`).toBeLessThanOrEqual(width);
    }

    await expect(page.getByTestId('catalog-results-title')).toBeHidden();
    const resultsToolbar = await page.getByTestId('catalog-results-toolbar').boundingBox();
    expect(resultsToolbar?.width, `results toolbar width at ${width}px`).toBeLessThanOrEqual(width);
    const gridBox = await page.getByTestId('catalog-grid-view').boundingBox();
    const listBox = await page.getByTestId('catalog-list-view').boundingBox();
    expect(Math.abs((gridBox?.width || 0) - (listBox?.width || 0)), `balanced view toggle at ${width}px`).toBeLessThanOrEqual(2);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
  }
});
