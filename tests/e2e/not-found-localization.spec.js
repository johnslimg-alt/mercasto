import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const languages = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja'];
const homeCopy = Object.fromEntries(languages.map(lang => [
  lang,
  JSON.parse(fs.readFileSync(new URL(`../../src/locales/${lang}.json`, import.meta.url), 'utf8')).home,
]));

async function setLanguage(page, lang) {
  await page.addInitScript(savedLang => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
  }, lang);
}

async function mockApi(page) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/categories') || url.pathname.endsWith('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    if (url.pathname.endsWith('/banners')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ banners: [] }) });
    }
    if (url.pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function expectNoOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

for (const lang of languages) {
  test(`404 navigation is localized in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const copy = homeCopy[lang];
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/qa-route-that-does-not-exist', { waitUntil: 'domcontentloaded' });

    const screen = page.getByTestId('not-found-screen');
    await expect(screen.getByRole('button', { name: copy.home, exact: true })).toBeVisible();
    await expect(screen.getByRole('button', { name: `🚗 ${copy.motor}`, exact: true })).toBeVisible();
    await expect(screen.getByRole('button', { name: `🏠 ${copy.realEstate}`, exact: true })).toBeVisible();
    await expect(screen.getByRole('button', { name: `💼 ${copy.jobs}`, exact: true })).toBeVisible();
    await expect(screen.getByRole('button', { name: `🔧 ${copy.services}`, exact: true })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    await expectNoOverflow(page);
  });
}

for (const lang of ['es', 'zh', 'ar', 'ru']) {
  test(`404 ${lang} fits mobile and RTL`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile');
    const copy = homeCopy[lang];
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/qa-route-that-does-not-exist', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('not-found-screen').getByRole('button', { name: copy.home, exact: true })).toBeVisible();
    await expect.poll(() => page.locator('html').getAttribute('dir')).toBe(lang === 'ar' ? 'rtl' : 'ltr');
    await expectNoOverflow(page);
  });
}
