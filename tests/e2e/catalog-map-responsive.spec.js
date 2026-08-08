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
