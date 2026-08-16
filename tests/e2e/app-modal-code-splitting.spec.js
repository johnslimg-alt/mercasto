import { expect, test } from '@playwright/test';
import enTranslations from '../../src/constants/translations/en.js';

const user = {
  id: 777,
  name: 'Modal QA',
  email: 'modal-qa@example.test',
  role: 'individual',
  balance: 500,
  unlimited_balance: false,
  is_verified: true,
  email_verified_at: '2026-08-14T00:00:00Z',
  onboarding_completed_at: '2026-08-14T00:00:00Z',
};

const ad = {
  id: 43,
  title: 'QA Lazy Modal Ad',
  description: 'QA description',
  price: 1000,
  status: 'active',
  category: 'electronica',
  location: 'Veracruz',
  images: [],
  user_id: 900,
  user: { id: 900, name: 'Seller QA', created_at: '2024-01-01T00:00:00Z', is_verified: true },
};

async function installSession(page, lang = 'en') {
  await page.addInitScript(({ savedLang, savedUser }) => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('auth_token', 'modal-split-token');
    localStorage.setItem('user', JSON.stringify(savedUser));
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
  }, { savedLang: lang, savedUser: user });
}

async function mockApi(page) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/user') && request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    if (path.endsWith('/user/ads')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    if (path.endsWith('/user/payments')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], current_page: 1, last_page: 1, total: 0 }) });
    if (path.endsWith('/ads/43/similar')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (path.endsWith('/ads/43/price-history')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ history: [] }) });
    if (path.endsWith('/ads/43')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ad) });
    if (path.endsWith('/ads')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    if (path.endsWith('/categories') || path.endsWith('/category-attributes') || path.endsWith('/favorites')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (path.endsWith('/auth/providers')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    if (path.includes('/notifications')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function hasChunk(page, chunkName) {
  return page.evaluate(name => performance.getEntriesByType('resource').some(entry => entry.name.includes(`/${name}-`) && entry.name.endsWith('.js')), chunkName);
}

test('pricing modal chunk and keyboard focus stay correct on desktop and mobile layouts', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  const t = enTranslations;
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await installSession(page, 'en');
    await mockApi(page);
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => hasChunk(page, 'PricingModal')).toBe(false);

    const opener = page.getByRole('button', { name: t.view_plans, exact: true }).last();
    await opener.focus();
    await opener.click();
    const dialog = page.getByRole('dialog', { name: t.pricing_title });
    const closeButton = dialog.getByRole('button', { name: t.close_btn || t.close, exact: true });
    await expect(dialog).toBeVisible();
    await expect(closeButton).toBeFocused();
    await closeButton.press('Shift+Tab');
    await expect.poll(() => dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);

    await dialog.getByRole('button', { name: t.pm_tab_promos, exact: true }).click();
    await expect(dialog.getByRole('combobox', { name: t.pm_promote_ad_label, exact: true })).toBeVisible();
    await expect(dialog.getByRole('spinbutton', { name: t.pm_custom_amount, exact: true })).toBeVisible();
    for (const [label, price] of [
      [t.pm_boost_1d_name, '$19'],
      [t.pm_boost_3d_name, '$49'],
      [t.pm_highlight_7d_name, '$79'],
      [t.pm_featured_7d_name, '$149'],
      [t.pm_featured_30d_name, '$399'],
      [t.pm_top_category_name, '$399'],
    ]) {
      await expect(dialog.getByRole('button', { name: `${label} — ${price}`, exact: true })).toBeVisible();
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await expect.poll(() => hasChunk(page, 'PricingModal')).toBe(true);
  }
});

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`profile and coupon dialogs expose modal semantics on ${viewport.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const t = enTranslations;
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installSession(page, 'en');
    await mockApi(page);
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });

    const profileOpener = page.getByRole('button', { name: t.edit_profile, exact: true }).first();
    await profileOpener.focus();
    await profileOpener.click();
    const profileDialog = page.getByRole('dialog', { name: t.edit_profile_title });
    await expect(profileDialog.getByRole('button', { name: t.change_photo, exact: true })).toBeAttached();
    await expect(profileDialog.getByRole('textbox', { name: t.name_label, exact: true })).toBeVisible();
    const profileClose = profileDialog.getByRole('button', { name: t.close_btn || t.close, exact: true });
    await expect(profileClose).toBeFocused();
    await profileClose.press('Shift+Tab');
    await expect.poll(() => profileDialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(profileDialog).toHaveCount(0);
    await expect(profileOpener).toBeFocused();

    const couponOpener = viewport.name === 'mobile'
      ? page.getByTestId('dashboard-mobile-redeem-coupon')
      : page.getByRole('button', { name: t.redeem_coupon, exact: true }).first();
    await expect(couponOpener).toBeVisible();
    await couponOpener.focus();
    await couponOpener.press('Enter');
    const couponDialog = page.getByRole('dialog', { name: t.redeem_coupon_title });
    await expect(couponDialog.getByRole('textbox', { name: t.coupon_code_placeholder, exact: true })).toBeVisible();
    const couponClose = couponDialog.getByRole('button', { name: t.close_btn || t.close, exact: true });
    await expect(couponClose).toBeFocused();
    await couponClose.press('Shift+Tab');
    await expect.poll(() => couponDialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(couponDialog).toHaveCount(0);
    await expect(couponOpener).toBeFocused();
  });
}

test('report modal chunk loads only after the report action', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  const t = enTranslations;
  await installSession(page, 'en');
  await mockApi(page);
  await page.goto('/ads/43', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => hasChunk(page, 'ReportModal')).toBe(false);

  const reportOpener = page.getByRole('button', { name: t.report_ad, exact: true });
  await reportOpener.focus();
  await reportOpener.click();
  const reportDialog = page.getByRole('dialog', { name: t.report_ad, exact: true });
  await expect(reportDialog.getByRole('combobox', { name: t.reason, exact: true })).toBeVisible();
  await expect(reportDialog.getByRole('textbox', { name: t.comments, exact: true })).toBeVisible();
  const reportClose = reportDialog.getByRole('button', { name: t.close_btn || t.close, exact: true });
  await expect(reportDialog).toBeVisible();
  await expect(reportClose).toBeFocused();
  await reportClose.press('Shift+Tab');
  await expect.poll(() => reportDialog.evaluate(dialog => dialog.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(reportDialog).toHaveCount(0);
  await expect(reportOpener).toBeFocused();
  await expect.poll(() => hasChunk(page, 'ReportModal')).toBe(true);
});
