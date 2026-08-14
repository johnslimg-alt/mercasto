import { test, expect } from '@playwright/test';
import { SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';

const translations = {};
for (const lang of SUPPORTED_LANGUAGES) {
  translations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

const user = { id: 91, name: 'QA User', email: 'qa@example.test', role: 'individual', is_verified: true };

async function setLanguageAndAuth(page, lang) {
  await page.addInitScript(({ savedLang, savedUser }) => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('auth_token', 'listing-action-token');
    localStorage.setItem('user', JSON.stringify(savedUser));
  }, { savedLang: lang, savedUser: user });
}

async function mockApi(page, onSavedPayload) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/user') && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    }
    if (pathname.endsWith('/user/search-alerts') && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (pathname.endsWith('/user/search-alerts') && request.method() === 'POST') {
      const payload = request.postDataJSON();
      onSavedPayload(payload);
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 99, name: 'Saved QA', ...payload, category_slug: payload.category, is_active: true }),
      });
    }
    if (pathname.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    if (pathname.endsWith('/category-attributes') || pathname.endsWith('/favorites')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ providers: { google: false, apple: false, telegram: false, sms: false } }) });
    }
    if (pathname.endsWith('/categories')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (pathname.includes('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

for (const lang of SUPPORTED_LANGUAGES) {
  test(`saved-search action feedback follows ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    let savedPayload = null;
    const t = translations[lang];
    await setLanguageAndAuth(page, lang);
    await mockApi(page, payload => { savedPayload = payload; });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/listings?search=corolla&category=coches&state=Nuevo%20Le%C3%B3n&city=Monterrey', { waitUntil: 'domcontentloaded' });

    await page.getByTestId('catalog-save-search').click();
    await expect.poll(() => savedPayload).not.toBeNull();
    expect(savedPayload.query).toBe('corolla');
    expect(savedPayload.category).toBe('coches');
    expect(savedPayload.city).toBe('Monterrey');
    expect(savedPayload.state).toBe('Nuevo León');
    await expect(page.getByText(t.listing_action_search_saved, { exact: true })).toBeVisible({ timeout: 5000 });
    await expect.poll(() => page.locator('html').getAttribute('lang')).toBe(lang === 'es' ? 'es-MX' : lang);
    await expect.poll(() => page.locator('html').getAttribute('dir')).toBe(lang === 'ar' ? 'rtl' : 'ltr');
  });
}
