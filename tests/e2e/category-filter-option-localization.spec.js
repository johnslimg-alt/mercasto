import { expect, test } from '@playwright/test';
import { filterOptionLabel, loadFilterOptionLanguage } from '../../src/utils/filterOptionTranslations.js';

const languages = ['es','en','pt','fr','zh','ko','de','it','ar','ru','ja'];

const shellTranslations = {};
for (const lang of languages) {
  shellTranslations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

async function mockCatalogApi(page) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    if (url.pathname.endsWith('/category-attributes') || url.pathname.endsWith('/categories')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

for (const lang of languages) {
  test(`category option labels localize without changing canonical values in ${lang}`, async ({ page }, testInfo) => {
    await loadFilterOptionLanguage(lang);
    await page.addInitScript(savedLang => {
      localStorage.setItem('lang', savedLang);
      localStorage.setItem('mercasto_language', savedLang);
    }, lang);
    await mockCatalogApi(page);
    await page.goto('/listings?category=coches');

    const expected = (fieldId, value) => filterOptionLabel(fieldId, value, lang);
    if (testInfo.project.name === 'chromium-mobile') {
      await page.getByTestId('catalog-mobile-filters').click();
      const dialog = page.getByRole('dialog');
      const bodyType = dialog.getByTestId('sidebar-category-filter-carroceria');
      await expect(bodyType.locator('option[value="Sedán"]')).toHaveText(expected('carroceria', 'Sedán'));
      await expect(dialog.getByTestId('sidebar-category-filter-documentacion').locator('option[value="Factura original"]')).toHaveText(expected('documentacion', 'Factura original'));
      await expect(dialog.getByTestId('sidebar-category-filter-uso').locator('option[value="Flotilla"]')).toHaveText(expected('uso', 'Flotilla'));
      await expect(dialog.getByTestId('sidebar-category-filter-marca').locator('option[value="Toyota"]')).toHaveText('Toyota');
      await expect(dialog.getByTestId('sidebar-category-filter-marca').locator('option[value="Otra"]')).toHaveText(expected('marca', 'Otra'));
      await bodyType.selectOption('Sedán');
      await expect(bodyType).toHaveValue('Sedán');
    } else {
      const sedan = page.getByTestId('sidebar-category-filter-carroceria-Sedán');
      await expect(sedan.locator('xpath=..')).toContainText(expected('carroceria', 'Sedán'));
      await expect(page.getByTestId('sidebar-category-filter-documentacion-Factura original').locator('xpath=..')).toContainText(expected('documentacion', 'Factura original'));
      await expect(page.getByTestId('sidebar-category-filter-uso-Flotilla').locator('xpath=..')).toContainText(expected('uso', 'Flotilla'));
      const brand = page.getByTestId('sidebar-category-filter-marca');
      await expect(brand.locator('option[value="Toyota"]')).toHaveText('Toyota');
      await expect(brand.locator('option[value="Otra"]')).toHaveText(expected('marca', 'Otra'));
      await sedan.check();
      await expect(sedan).toBeChecked();
    }

    await expect.poll(() => decodeURIComponent(page.url())).toContain('filters[carroceria][]=Sedán');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}


for (const lang of languages) {
  test(`header subcategory placeholder localizes in ${lang}`, async ({ page }) => {
    await page.addInitScript(savedLang => {
      localStorage.setItem('lang', savedLang);
      localStorage.setItem('mercasto_language', savedLang);
    }, lang);
    await mockCatalogApi(page);
    await page.goto('/?category=motor');

    const subcategory = page.locator('select:visible').filter({ has: page.locator('option[value="SUV"]') }).first();
    await expect(subcategory).toBeVisible();
    await expect(subcategory.locator('option[value=""]')).toHaveText(shellTranslations[lang].all_subcategories);
  });
}
