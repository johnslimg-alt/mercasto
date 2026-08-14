import { test, expect } from '@playwright/test';
import { SUPPORTED_LANGUAGES, getTranslations, loadLanguage } from '../../src/utils/translations.js';
import { getAdDetailCopy, formatAdDetailCopy } from '../../src/utils/adDetailCopy.js';
import { filterOptionLabel } from '../../src/utils/filterOptionTranslations.js';
import { formatDate, formatNumber } from '../../src/utils/localeFormat.js';

const catalogAd = {
  id: 42,
  title: 'QA Catalog Phone',
  description: 'QA catalog description',
  price: 1234567,
  old_price: 1500000,
  price_dropped_at: '2026-08-10T00:00:00Z',
  category: 'electronica',
  subcategory: 'Telefonía',
  condition: 'usado',
  status: 'active',
  is_catalog_filler: true,
  attributes: { marca: 'Samsung', condicion: ['Usado'] },
  created_at: '2026-06-15T12:00:00Z',
  views: 1234,
  user_id: null,
  user: null,
};

const realAd = {
  ...catalogAd,
  id: 43,
  title: 'QA Real Phone',
  is_catalog_filler: false,
  old_price: null,
  price_dropped_at: null,
  user_id: 77,
  user: { id: 77, name: 'QA Seller', created_at: '2024-01-15T00:00:00Z', is_verified: true },
};

async function mockApi(page) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith('/ads/42/similar') || path.endsWith('/ads/43/similar')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/ads/42/price-history') || path.endsWith('/ads/43/price-history')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ history: [] }) });
    }
    if (path.endsWith('/ads/42')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(catalogAd) });
    if (path.endsWith('/ads/43')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(realAd) });
    if (path.endsWith('/ads')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    if (path.endsWith('/categories') || path.endsWith('/category-attributes')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (path.endsWith('/auth/providers')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    if (path.endsWith('/banners')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ banners: [] }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function setLanguage(page, lang) {
  await page.addInitScript(savedLang => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
  }, lang);
}

async function expected(lang) {
  await loadLanguage(lang);
  return { t: getTranslations(lang), copy: getAdDetailCopy(lang) };
}

async function expectDocumentLanguage(page, lang) {
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(lang === 'es' ? 'es-MX' : lang);
  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(lang === 'ar' ? 'rtl' : 'ltr');
}

async function expectNoOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

for (const lang of SUPPORTED_LANGUAGES) {
  test(`catalog ad detail renders localized public copy in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const { t, copy } = await expected(lang);
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/ads/42', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);

    await expect(page.getByRole('heading', { level: 1, name: catalogAd.title })).toBeVisible();
    await expect(page.getByText(copy.catalogTitle, { exact: true })).toBeVisible();
    await expect(page.getByText(copy.catalogBody, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.publishSimilar, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: copy.sellTitle, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.publishFree, exact: true })).toBeVisible();
    await expect(page.getByText(`$${formatNumber(catalogAd.price, lang)} MXN`, { exact: false })).toBeVisible();
    await expect(page.getByText(filterOptionLabel('condicion', 'Usado', lang), { exact: true }).first()).toBeVisible();
    await expect(page.getByText(t.filter_label_marca || 'Marca', { exact: true })).toBeVisible();
    await expect(page.getByText('Samsung', { exact: true })).toBeVisible();
    await expectNoOverflow(page);
  });
}

for (const lang of ['en', 'ru', 'ar', 'zh']) {
  test(`real ad metadata is locale-aware in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const { t, copy } = await expected(lang);
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/ads/43', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);

    await expect(page.getByText(`${formatNumber(realAd.views, lang)} ${t.views || copy.views}`, { exact: true })).toBeVisible();
    await expect(page.getByText(formatDate(realAd.created_at, lang), { exact: true })).toBeVisible();
    await expect(page.getByText(formatAdDetailCopy(copy.memberSince, { year: 2024 }), { exact: true })).toBeVisible();
    await expect(page.getByText(copy.loginToMessageHint, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.loginToMessage, exact: true })).toBeVisible();
    await expect(page.locator(`[title="${copy.verifiedSeller}"]`)).toBeAttached();
    await expectNoOverflow(page);
  });
}

for (const lang of ['es', 'zh', 'ar', 'ru']) {
  test(`catalog ad detail ${lang} fits mobile and RTL`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile');
    const { copy } = await expected(lang);
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/ads/42', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);
    await expect(page.getByText(copy.catalogTitle, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: copy.sellTitle, exact: true })).toBeVisible();
    await expectNoOverflow(page);
  });
}
