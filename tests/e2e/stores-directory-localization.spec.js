import { test, expect } from '@playwright/test';
import { SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';
import { getStoresDirectoryCategories, getStoresDirectoryCopy } from '../../src/utils/storesDirectoryCopy.js';

const store = {
  id: 77,
  name: 'QA Store Owner',
  business_name: 'QA PRO Store',
  business_logo_url: null,
  business_banner_url: null,
  business_address: null,
  business_description: null,
  is_verified: true,
  rating_avg: 4.8,
  rating_count: 5,
  active_ads_count: 3,
};

async function setLanguage(page, lang) {
  await page.addInitScript(savedLang => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
  }, lang);
}

async function mockApi(page, storeRequests) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/stores')) {
      storeRequests.push(url.toString());
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [store], last_page: 1, total: 1 }) });
    }
    if (url.pathname.endsWith('/categories') || url.pathname.endsWith('/category-attributes')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (url.pathname.endsWith('/auth/providers')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    if (url.pathname.endsWith('/banners')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ banners: [] }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function expectDocumentLanguage(page, lang) {
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(lang === 'es' ? 'es-MX' : lang);
  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(lang === 'ar' ? 'rtl' : 'ltr');
}

async function expectNoOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

for (const lang of SUPPORTED_LANGUAGES) {
  test(`stores directory renders localized copy and canonical category query in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const copy = getStoresDirectoryCopy(lang);
    const categories = getStoresDirectoryCategories(lang);
    const requests = [];
    await setLanguage(page, lang);
    await mockApi(page, requests);
    await page.goto('/tiendas', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);

    await expect(page.getByRole('heading', { level: 1, name: copy.title, exact: true })).toBeVisible();
    await expect(page.getByPlaceholder(copy.search)).toBeVisible();
    await expect(page.getByText(copy.defaultDescription, { exact: true })).toBeVisible();
    await expect(page.getByText(copy.mexico, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(copy.view, { exact: true })).toBeVisible();
    await expect.poll(() => page.title()).toBe(copy.seoTitle);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', copy.seoDescription);
    await expect(page.locator('select').last().getByRole('option', { name: categories[0].label, exact: true })).toBeAttached();
    await expectNoOverflow(page);

    await page.getByRole('button', { name: categories[0].label, exact: true }).click();
    await expect.poll(() => requests.some(raw => new URL(raw).searchParams.get('category') === categories[0].query)).toBe(true);
  });
}

for (const lang of ['es', 'zh', 'ar', 'ru']) {
  test(`stores directory ${lang} fits mobile and RTL`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile');
    const copy = getStoresDirectoryCopy(lang);
    const requests = [];
    await setLanguage(page, lang);
    await mockApi(page, requests);
    await page.goto('/tiendas', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);
    await expect(page.getByRole('heading', { level: 1, name: copy.title, exact: true })).toBeVisible();
    await expect(page.getByText(copy.defaultDescription, { exact: true })).toBeVisible();
    await expectNoOverflow(page);
  });
}
