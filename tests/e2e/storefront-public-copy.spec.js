import { test, expect } from '@playwright/test';
import { SUPPORTED_LANGUAGES, getTranslations, loadLanguage } from '../../src/utils/translations.js';

const company = {
  id: 77,
  name: 'QA Storefront',
  role: 'business',
  is_verified: true,
  whatsapp: '5212291234567',
};

const businessProfile = {
  enabled: true,
  business_name: 'QA Storefront',
  business_address: null,
  business_description: 'QA business description',
  business_rfc_verified: true,
  business_website: 'https://example.com',
  business_hours: [
    { day: 'Monday', closed: true },
    { day: 'Tuesday', open: '09:00', close: '18:00' },
  ],
};

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
    const path = url.pathname;
    if (path.endsWith('/users/77/profile')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(company) });
    if (path.endsWith('/users/77/business-profile')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(businessProfile) });
    if (path.endsWith('/users/77/reviews')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reviews: [], average: 0, total: 0 }) });
    if (path.endsWith('/ads') && url.searchParams.get('user_id') === '77') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    if (path.endsWith('/categories') || path.endsWith('/category-attributes')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (path.endsWith('/auth/providers')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    if (path.endsWith('/banners')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ banners: [] }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function expected(lang) {
  await loadLanguage(lang);
  return getTranslations(lang);
}

async function expectDocumentLanguage(page, lang) {
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(lang === 'es' ? 'es-MX' : lang);
  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(lang === 'ar' ? 'rtl' : 'ltr');
}

async function expectNoOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

for (const lang of SUPPORTED_LANGUAGES) {
  test(`storefront public fallbacks render in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const t = await expected(lang);
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/?store=77', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);

    await expect(page.getByRole('heading', { level: 1, name: company.name, exact: false })).toBeVisible();
    await expect(page.getByRole('main').getByText(t.all_mexico, { exact: true })).toBeVisible();
    await expect(page.getByText(t.rfc_verified, { exact: true })).toBeVisible();
    await expect(page.getByText(t.business_profile_tag, { exact: true })).toBeVisible();
    await expect(page.getByText(t.website, { exact: true })).toBeVisible();
    await expect(page.getByText(`Monday: ${t.closed_hours}`, { exact: true })).toBeVisible();
    await expect(page.getByText(t.noAds, { exact: true })).toBeVisible();
    await expect(page.getByText(t.no_reviews, { exact: true })).toBeVisible();
    await expect(page.getByAltText(t.cover_photo)).toBeVisible();
    await expectNoOverflow(page);
  });
}

for (const lang of ['es', 'zh', 'ar', 'ru']) {
  test(`storefront ${lang} fits mobile and RTL`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile');
    const t = await expected(lang);
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/?store=77', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);
    await expect(page.getByText(t.business_profile_tag, { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByText(t.all_mexico, { exact: true })).toBeVisible();
    await expectNoOverflow(page);
  });
}
