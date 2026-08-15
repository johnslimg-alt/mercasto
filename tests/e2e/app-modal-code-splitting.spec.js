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

test('pricing modal chunk loads only when the pricing UI opens', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  const t = enTranslations;
  await installSession(page, 'en');
  await mockApi(page);
  await page.goto('/profile', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => hasChunk(page, 'PricingModal')).toBe(false);

  await page.getByRole('button', { name: t.view_plans, exact: true }).click();
  await expect(page.getByRole('heading', { name: t.pm_plan_impulso, exact: true })).toBeVisible();
  await expect.poll(() => hasChunk(page, 'PricingModal')).toBe(true);
});

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
