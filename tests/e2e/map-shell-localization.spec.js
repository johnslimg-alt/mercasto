import { test, expect } from '@playwright/test';
import { localeFor } from '../../src/utils/localeFormat.js';
import { filterOptionLabel, loadFilterOptionLanguage } from '../../src/utils/filterOptionTranslations.js';

const languages = ['es','en','pt','fr','zh','ko','de','it','ar','ru','ja'];
const rtlLanguages = new Set(['ar']);
const localeData = {};
for (const lang of languages) {
  localeData[lang] = (await import(`../../src/locales/${lang}.json`, { with: { type: 'json' } })).default;
}

const mapAd = {
  id: 901,
  title: 'Toyota Corolla QA',
  description: 'QA map listing',
  category: 'motor',
  price: 1234567,
  latitude: 25.6866,
  longitude: -100.3161,
  state: 'Nuevo León',
  city: 'Monterrey',
  listing_type: 'Venta',
  condition: 'nuevo',
};

async function mockMapApi(page) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [mapAd], total: 1, current_page: 1, last_page: 1 }) });
    }    if (path.endsWith('/categories') || path.endsWith('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

for (const lang of languages) {
  test(`map shell is localized in ${lang}`, async ({ page }, testInfo) => {
    const tr = localeData[lang];
    await loadFilterOptionLanguage(lang);
    await page.addInitScript(savedLang => {
      localStorage.setItem('lang', savedLang);
      localStorage.setItem('mercasto_language', savedLang);
    }, lang);
    await mockMapApi(page);
    await page.goto('/listings?category=motor');

    if (testInfo.project.name === 'chromium-mobile') {
      await page.getByTestId('catalog-map-toggle').click();
    }

    const expand = page.getByTestId('map-expand');
    await expect(expand).toBeVisible();
    await expand.click();

    const dialog = page.getByRole('dialog', { name: tr.map.interactive });
    await expect(dialog).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', rtlLanguages.has(lang) ? 'rtl' : 'ltr');
    const filterToggle = dialog.getByTestId('map-filter-toggle');
    await expect(filterToggle).toContainText(tr.map.filters);
    await filterToggle.click();

    await expect(dialog.getByTitle(tr.map.nearMe)).toBeVisible();
    await expect(dialog.getByTitle(tr.map.drawArea)).toBeVisible();
    await expect(dialog.getByTestId('map-filter-listing-type').locator('option').first()).toHaveText(tr.map.listingType);
    await dialog.getByTestId('map-filter-listing-type').selectOption('Venta');
    await expect(dialog.getByTestId('map-filter-listing-type')).toHaveValue('Venta');
    await expect(dialog.getByTestId('map-filter-listing-type').locator('option[value="Venta"]')).toHaveText(tr.map.listingSale);

    const newCondition = dialog.getByTestId('map-condition-nuevo');
    await expect(newCondition).toHaveText(tr.map.conditionNew);
    await expect(dialog.getByTestId('map-condition-usado')).toHaveText(tr.map.conditionUsed);
    await expect(dialog.getByTestId('map-condition-reacondicionado')).toHaveText(tr.map.conditionRefurbished);
    await expect(dialog.getByTestId('map-condition-para_piezas')).toHaveText(tr.map.conditionParts);

    const mapBodyType = dialog.getByTestId('map-filter-dynamic-carroceria');
    await expect(mapBodyType.locator('option[value="Sedán"]')).toHaveText(filterOptionLabel('carroceria', 'Sedán', lang));
    await mapBodyType.selectOption('Sedán');
    await expect(mapBodyType).toHaveValue('Sedán');

    const expectedPrice = new Intl.NumberFormat(localeFor(lang), {
      style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1,
    }).format(mapAd.price);
    const markerPrice = (await dialog.locator('.custom-leaflet-marker').first().innerText()).replace(/\s+/g, '');
    expect(markerPrice).toContain(expectedPrice.replace(/\s+/g, ''));

    await expect(dialog.getByTestId('map-search-area')).toContainText(tr.map.searchArea);
    await expect(dialog.getByTestId('map-close')).toHaveAttribute('aria-label', tr.map.closeMap);
    if (lang !== 'es') {
      const text = await dialog.innerText();
      const stalePairs = [
        ['Mapa interactivo', tr.map.interactive],
        ['Filtros', tr.map.filters],
        ['Cerca de mí', tr.map.nearMe],
        ['Dibujar área', tr.map.drawArea],
        ['Tipo de anuncio', tr.map.listingType],
      ];
      for (const [stale, expected] of stalePairs) {
        if (stale !== expected) expect(text).not.toContain(stale);
      }
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await dialog.getByTestId('map-close').click();
    await expect(dialog).toBeHidden();
  });
}
