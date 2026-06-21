import { test, expect } from '@playwright/test';

test('desktop header search and location work', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.goto('/');

  await page.getByTestId('desktop-search-input').fill('Toyota');
  await page.getByTestId('desktop-search-submit').click();
  await expect(page).toHaveURL(/search=Toyota/);

  await page.getByTestId('desktop-location-button').click();
  await page.getByTestId('desktop-location-state').selectOption('Jalisco');
  await expect(page.getByTestId('desktop-location-city')).toBeEnabled();
  await page.getByTestId('desktop-location-city').selectOption('Guadalajara');
  await page.getByTestId('desktop-location-apply').click();

  await expect(page).toHaveURL(/location=Guadalajara%2C\+Jalisco/);
  await expect(page).toHaveURL(/state=Jalisco/);
  await expect(page).toHaveURL(/city=Guadalajara/);
  await expect(page.getByTestId('desktop-location-button')).toContainText('Guadalajara');
});

test('mobile header has a working search button and location cascade', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await page.goto('/');

  await page.getByTestId('mobile-search-input').fill('iPhone');
  await page.getByTestId('mobile-search-submit').click();
  await expect(page).toHaveURL(/search=iPhone/);

  await page.locator('.mobile-location-chip').click();
  const state = page.locator('[data-testid="mobile-header-search"] + * select').first();
  await state.selectOption('Nuevo León');
  const selects = page.locator('.header-popover select');
  await expect(selects.nth(1)).toBeEnabled();
  await selects.nth(1).selectOption('Monterrey');
  await page.getByTestId('mobile-location-apply').click();

  await expect(page).toHaveURL(/state=Nuevo\+Le%C3%B3n/);
  await expect(page).toHaveURL(/city=Monterrey/);
});
