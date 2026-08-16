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

async function mockApi(page, viewer = null) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith('/user') && route.request().method() === 'GET' && viewer) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(viewer) });
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

async function mockStorefrontSecondaryRecoveryApi(page, state) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith('/users/77/profile')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(company) });
    if (path.endsWith('/users/77/business-profile')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(businessProfile) });
    if (path.endsWith('/users/77/reviews')) {
      if (!state.reviews) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'reviews unavailable' }) });
      await new Promise(resolve => setTimeout(resolve, 650));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reviews: [], average: 0, total: 0 }) });
    }
    if (path.endsWith('/ads') && url.searchParams.get('user_id') === '77') {
      if (!state.ads) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'ads unavailable' }) });
      await new Promise(resolve => setTimeout(resolve, 650));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    }
    if (path.endsWith('/categories') || path.endsWith('/category-attributes')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (path.endsWith('/auth/providers')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    if (path.endsWith('/banners')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ banners: [] }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

for (const lang of ['es', 'en']) {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`storefront keeps ads and reviews outages independent in ${lang} on ${viewport.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-desktop');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const t = await expected(lang);
      await setLanguage(page, lang);
      const state = { ads: false, reviews: false };
      await mockStorefrontSecondaryRecoveryApi(page, state);
      await page.goto('/?store=77', { waitUntil: 'domcontentloaded' });
      await expectDocumentLanguage(page, lang);

      await expect(page.getByRole('heading', { level: 1, name: company.name, exact: false })).toBeVisible();
      await expect(page.getByTestId('storefront-ads-load-error')).toContainText(t.connection_error);
      await expect(page.getByTestId('storefront-reviews-load-error')).toContainText(t.connection_error);
      await expect(page.getByTestId('storefront-ads-empty')).toHaveCount(0);
      await expect(page.getByTestId('storefront-reviews-empty')).toHaveCount(0);

      state.ads = true;
      await page.getByTestId('storefront-ads-retry').click();
      await expect(page.getByTestId('storefront-ads-loading')).toBeVisible();
      await expect(page.getByTestId('storefront-ads-empty')).toHaveText(t.noAds);
      await expect(page.getByTestId('storefront-reviews-load-error')).toBeVisible();

      state.reviews = true;
      await page.getByTestId('storefront-reviews-retry').click();
      await expect(page.getByTestId('storefront-reviews-loading')).toBeVisible();
      await expect(page.getByTestId('storefront-reviews-empty')).toHaveText(t.no_reviews);
      await expectNoOverflow(page);
    });
  }
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`storefront review rating is keyboard-operable on ${viewport.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const viewer = { id: 91, name: 'QA Viewer', email: 'viewer@example.test', role: 'individual', is_verified: true };
    const t = await expected('es');
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript(({ savedUser }) => {
      localStorage.setItem('lang', 'es');
      localStorage.setItem('mercasto_language', 'es');
      localStorage.setItem('cookiesAccepted', 'true');
      localStorage.setItem('auth_token', 'storefront-review-a11y-token');
      localStorage.setItem('user', JSON.stringify(savedUser));
    }, { savedUser: viewer });
    await mockApi(page, viewer);
    await page.goto('/?store=77', { waitUntil: 'domcontentloaded' });

    const reviewComment = page.getByRole('textbox', { name: t.review_placeholder, exact: true });
    await expect(reviewComment).toBeVisible();
    const oneStar = page.getByRole('button', { name: '1 / 5' });
    const fiveStars = page.getByRole('button', { name: '5 / 5' });
    await expect(fiveStars).toHaveAttribute('aria-pressed', 'true');
    await oneStar.focus();
    await expect(oneStar).toBeFocused();
    await page.keyboard.press('Space');
    await expect(oneStar).toHaveAttribute('aria-pressed', 'true');
    await expect(fiveStars).toHaveAttribute('aria-pressed', 'false');
  });
}


for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`storefront report and QR dialogs trap focus on ${viewport.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const t = await expected('en');
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await setLanguage(page, 'en');
    await page.addInitScript(() => localStorage.setItem('cookie_consent', 'essential'));
    await mockApi(page);
    await page.goto('/?store=77', { waitUntil: 'domcontentloaded' });

    const reportOpener = page.getByRole('button', { name: t.report_seller, exact: true });
    await reportOpener.focus();
    await reportOpener.click();
    const reportDialog = page.getByRole('dialog', { name: t.report_seller, exact: true });
    await expect(reportDialog.getByRole('combobox', { name: t.reason, exact: true })).toBeVisible();
    await expect(reportDialog.getByRole('textbox', { name: t.report_additional_details, exact: true })).toBeVisible();
    const reportClose = reportDialog.getByRole('button', { name: t.close_btn || t.close, exact: true });
    await expect(reportClose).toBeFocused();
    await reportClose.press('Shift+Tab');
    await expect.poll(() => reportDialog.evaluate(dialog => dialog.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(reportDialog).toHaveCount(0);
    await expect(reportOpener).toBeFocused();

    const qrOpener = page.getByRole('button', { name: t.scan_qr, exact: true });
    await qrOpener.focus();
    await qrOpener.click();
    const qrDialog = page.getByRole('dialog', { name: t.qr_contact_title, exact: true });
    const qrClose = qrDialog.getByRole('button', { name: t.close_btn || t.close, exact: true }).first();
    await expect(qrClose).toBeFocused();
    await qrClose.press('Shift+Tab');
    await expect.poll(() => qrDialog.evaluate(dialog => dialog.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(qrDialog).toHaveCount(0);
    await expect(qrOpener).toBeFocused();
  });
}
