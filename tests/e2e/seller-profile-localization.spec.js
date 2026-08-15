import { test, expect } from '@playwright/test';
import { SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';
import { formatNumber } from '../../src/utils/localeFormat.js';
import { formatSellerProfileCopy, getSellerProfileCopy, sellerReviewLabel } from '../../src/utils/sellerProfileCopy.js';

const seller = {
  id: 77,
  name: 'QA Seller',
  phone_verified: true,
  email_verified: true,
  is_verified: true,
  city: 'Veracruz',
  member_since: '2024-01-15T00:00:00Z',
  rating_avg: 4.8,
  rating_count: 2,
  active_ads: 1,
  bio: 'QA seller bio',
  website: 'https://example.com',
  social_instagram: 'qaseller',
};

const ad = {
  id: 901,
  title: 'QA Phone',
  price: 1234567,
  image_url: null,
};

async function setLanguage(page, lang) {
  await page.addInitScript(savedLang => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
  }, lang);
}

async function mockApi(page, { missing = false } = {}) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/users/77/profile')) {
      return route.fulfill({ status: missing ? 404 : 200, contentType: 'application/json', body: missing ? '{}' : JSON.stringify(seller) });
    }
    if (url.pathname.endsWith('/ads') && url.searchParams.get('user_id') === '77') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [ad] }) });
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
  test(`seller profile renders localized public copy in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const copy = getSellerProfileCopy(lang);
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/vendedor/77', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);

    await expect(page.getByRole('heading', { level: 1, name: seller.name })).toBeVisible();
    await expect(page.getByText(formatSellerProfileCopy(copy.memberSince, { year: 2024 }), { exact: true })).toBeVisible();
    await expect(page.getByText(`(${seller.rating_count} ${sellerReviewLabel(lang, seller.rating_count)})`, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: copy.about, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: copy.contact, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: copy.activeAds, exact: false })).toBeVisible();
    await expect(page.getByText(`$${formatNumber(ad.price, lang)}`, { exact: true })).toBeVisible();
    await expect(page.locator(`[title="${copy.verified}"]`)).toBeAttached();
    await expect(page.locator(`[title="${copy.phoneVerified}"]`).first()).toBeAttached();
    await expect(page.locator(`[title="${copy.emailVerified}"]`).first()).toBeAttached();
    await expectNoOverflow(page);
  });
}

for (const lang of ['es', 'zh', 'ar', 'ru']) {
  test(`seller profile ${lang} fits mobile and RTL`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile');
    const copy = getSellerProfileCopy(lang);
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/vendedor/77', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);
    await expect(page.getByRole('heading', { level: 1, name: seller.name })).toBeVisible();
    await expect(page.getByRole('heading', { name: copy.activeAds, exact: false })).toBeVisible();
    await expectNoOverflow(page);
  });
}

for (const lang of ['en', 'ru', 'ar']) {
  test(`missing seller error is localized in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const copy = getSellerProfileCopy(lang);
    await setLanguage(page, lang);
    await mockApi(page, { missing: true });
    await page.goto('/vendedor/77', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);
    await expect(page.getByText(copy.sellerNotFound, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.back, exact: true })).toBeVisible();
  });
}

async function mockSellerAdsRecoveryApi(page, shouldRecover) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/users/77/profile')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(seller) });
    }
    if (url.pathname.endsWith('/ads') && url.searchParams.get('user_id') === '77') {
      if (!shouldRecover()) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'temporarily unavailable' }) });
      await new Promise(resolve => setTimeout(resolve, 650));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [ad] }) });
    }
    if (url.pathname.endsWith('/categories') || url.pathname.endsWith('/category-attributes')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (url.pathname.endsWith('/auth/providers')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    if (url.pathname.endsWith('/banners')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ banners: [] }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

for (const lang of ['es', 'en']) {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`seller profile keeps ads outage distinct from no listings in ${lang} on ${viewport.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-desktop');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const copy = getSellerProfileCopy(lang);
      await setLanguage(page, lang);
      let recover = false;
      await mockSellerAdsRecoveryApi(page, () => recover);
      await page.goto('/vendedor/77', { waitUntil: 'domcontentloaded' });
      await expectDocumentLanguage(page, lang);

      await expect(page.getByRole('heading', { level: 1, name: seller.name })).toBeVisible();
      await expect(page.getByTestId('seller-profile-ads-load-error')).toContainText(copy.adsLoadError);
      await expect(page.getByTestId('seller-profile-ads-empty')).toHaveCount(0);
      await expect(page.getByTestId('seller-profile-ads-retry')).toHaveText(copy.retry);

      recover = true;
      await page.getByTestId('seller-profile-ads-retry').click();
      await expect(page.getByTestId('seller-profile-ads-loading')).toBeVisible();
      await expect(page.getByTestId('seller-profile-ads-load-error')).toHaveCount(0);
      await expect(page.getByText(`$${formatNumber(ad.price, lang)}`, { exact: true })).toBeVisible();
    });
  }
}
