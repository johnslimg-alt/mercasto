import { test, expect } from '@playwright/test';

const localeCases = ['es', 'en', 'ru', 'ar'];
const translations = {};
for (const lang of localeCases) {
  translations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

for (const lang of localeCases) {
  test(`desktop filters keep canonical URL values in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await page.addInitScript((savedLang) => localStorage.setItem('lang', savedLang), lang);
    await page.setViewportSize({ width: 1440, height: 1000 });
    const adRequests = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/ads?')) adRequests.push(request.url());
    });
    await page.goto('/listings');

    const venta = page.getByTestId('sidebar-filter-listing_type-Venta');
    await expect(venta.locator('xpath=..')).toContainText(translations[lang].gf_venta);
    await venta.check();
    await page.getByTestId('sidebar-filter-sort').selectOption('price_asc');
    await page.getByTestId('sidebar-filter-state').selectOption('Jalisco');
    await page.getByTestId('sidebar-filter-city').selectOption('Guadalajara');
    await page.getByTestId('sidebar-filter-min-price').fill('100');

    await expect.poll(() => page.url()).toContain('filters%5Blisting_type%5D%5B%5D=Venta');
    await expect(page).toHaveURL(/filters%5Bsort%5D=price_asc/);
    await expect(page).toHaveURL(/filters%5Blocation_state%5D=Jalisco/);
    await expect(page).toHaveURL(/filters%5Blocation_city%5D=Guadalajara/);
    await expect(page).toHaveURL(/min_price=100/);
    await expect.poll(() => adRequests.some((url) =>
      url.includes('filters%5Blisting_type%5D%5B%5D=Venta')
      && url.includes('filters%5Bsort%5D=price_asc')
      && url.includes('filters%5Blocation_city%5D=Guadalajara')
    )).toBeTruthy();

    const filteredUrl = page.url();
    await page.reload();
    await expect(page).toHaveURL(filteredUrl);
    await expect(page.getByTestId('sidebar-filter-listing_type-Venta')).toBeChecked();
    await expect(page.getByTestId('sidebar-filter-sort')).toHaveValue('price_asc');
    await expect(page.getByTestId('sidebar-filter-state')).toHaveValue('Jalisco');
    await expect(page.getByTestId('sidebar-filter-city')).toHaveValue('Guadalajara');
    await expect(page.getByTestId('sidebar-filter-min-price')).toHaveValue('100');
  });
}

test('mobile filter sheet persists canonical state and clear-all resets it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await page.addInitScript(() => localStorage.setItem('lang', 'en'));
  await page.goto('/listings');
  await page.getByTestId('catalog-mobile-filters').click();

  const sheet = page.getByRole('dialog');
  await sheet.getByTestId('sidebar-filter-listing_type').selectOption('Venta');
  await sheet.getByTestId('sidebar-filter-sort').selectOption('price_desc');
  await sheet.getByTestId('sidebar-filter-state').selectOption('Nuevo León');
  await sheet.getByTestId('sidebar-filter-city').selectOption('Monterrey');

  await expect.poll(() => page.url()).toContain('filters%5Blisting_type%5D%5B%5D=Venta');
  await expect(page).toHaveURL(/filters%5Bsort%5D=price_desc/);
  await expect(page).toHaveURL(/filters%5Blocation_city%5D=Monterrey/);

  await page.reload();
  await page.getByTestId('catalog-mobile-filters').click();
  const restoredSheet = page.getByRole('dialog');
  await expect(restoredSheet.getByTestId('sidebar-filter-listing_type')).toHaveValue('Venta');
  await expect(restoredSheet.getByTestId('sidebar-filter-sort')).toHaveValue('price_desc');
  await expect(restoredSheet.getByTestId('sidebar-filter-city')).toHaveValue('Monterrey');

  await restoredSheet.getByTestId('sidebar-clear-filters').click();
  await expect.poll(() => page.url()).not.toContain('filters%5B');
});
