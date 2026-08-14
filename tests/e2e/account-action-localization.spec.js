import { test, expect } from '@playwright/test';
import { SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';

const SPANISH_BACKEND_ERROR = 'Las credenciales proporcionadas son incorrectas.';
const translations = {};
for (const lang of SUPPORTED_LANGUAGES) {
  translations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

async function setLanguage(page, lang) {
  await page.addInitScript(savedLang => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
  }, lang);
}

async function mockApi(page) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path.endsWith('/login') && request.method() === 'POST') {
      return route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ message: SPANISH_BACKEND_ERROR }),
      });
    }
    if (path.endsWith('/auth/providers')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ providers: { google: false, apple: false, telegram: false, sms: false } }),
      });
    }
    if (path.endsWith('/categories') || path.endsWith('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    if (path.endsWith('/banners')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ banners: [] }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

for (const lang of SUPPORTED_LANGUAGES) {
  test(`invalid login action follows ${lang} instead of Spanish backend copy`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const t = translations[lang];

    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    const email = page.locator('input[name="email"]').first();
    const password = page.locator('input[name="password"]').first();
    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    await email.fill('wrong@example.com');
    await password.fill('WrongPassword123!');
    await password.press('Enter');

    const expected = lang === 'es' ? SPANISH_BACKEND_ERROR : t.account_action_invalid_credentials;
    await expect(page.getByText(expected, { exact: true })).toBeVisible({ timeout: 5000 });
    if (lang !== 'es') {
      await expect(page.getByText(SPANISH_BACKEND_ERROR, { exact: true })).toHaveCount(0);
    }
    await expect.poll(() => page.locator('html').getAttribute('lang')).toBe(lang === 'es' ? 'es-MX' : lang);
    await expect.poll(() => page.locator('html').getAttribute('dir')).toBe(lang === 'ar' ? 'rtl' : 'ltr');
  });
}
