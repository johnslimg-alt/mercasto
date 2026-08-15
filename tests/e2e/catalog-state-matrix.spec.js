import { test, expect } from '@playwright/test';

const translations = {
  es: (await import('../../src/constants/translations/es.js')).default,
  en: (await import('../../src/constants/translations/en.js')).default,
};

function emptyCatalog() {
  return { data: [], total: 0, current_page: 1, last_page: 1 };
}

async function mockCatalogDependencies(page, onAds) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path.endsWith('/ads') && request.method() === 'GET') return onAds(route);
    if (path.endsWith('/categories') || path.endsWith('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

for (const lang of ['es', 'en']) {
  test(`catalog distinguishes loading, empty and failure states in ${lang}`, async ({ page }) => {
    await page.addInitScript(savedLang => {
      localStorage.setItem('lang', savedLang);
      localStorage.setItem('mercasto_language', savedLang);
      localStorage.setItem('cookiesAccepted', 'true');
      localStorage.setItem('cookie_consent', 'essential');
    }, lang);

    let recover = false;
    let requests = 0;
    await mockCatalogDependencies(page, async route => {
      requests += 1;
      if (!recover) {
        return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'upstream unavailable' }) });
      }
      await new Promise(resolve => setTimeout(resolve, 1200));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyCatalog()) });
    });

    await page.goto('/listings');
    const error = page.getByTestId('catalog-load-error');
    await expect(error).toBeVisible();
    await expect(error).toContainText(translations[lang].route_load_error);
    await expect(page.getByTestId('catalog-empty')).toHaveCount(0);
    await expect(page.getByTestId('catalog-retry')).toHaveText(translations[lang].retry_btn);

    recover = true;
    await page.getByTestId('catalog-retry').click();
    await expect(page.getByTestId('catalog-loading')).toBeVisible();
    await expect(page.getByTestId('catalog-load-error')).toHaveCount(0);
    await expect(page.getByTestId('catalog-empty')).toBeVisible();
    expect(requests).toBeGreaterThanOrEqual(2);
  });
}
