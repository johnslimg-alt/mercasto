import { expect, test } from '@playwright/test';
import { ADMIN_OPERATIONAL_COPY } from '../../src/utils/adminOperationalCopy.js';
import { SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';

const adminUser = { id: 991, name: 'Admin QA', email: 'admin-qa@example.test', role: 'admin', is_verified: true };
const recoveryTranslations = {};
for (const lang of ['es', 'en']) {
  recoveryTranslations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

async function installAdmin(page, lang) {
  await page.addInitScript(({ savedLang, user }) => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('auth_token', 'admin-operational-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, { savedLang: lang, user: adminUser });
}

async function mockApi(page) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/user') && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminUser) });
    }
    if (path.endsWith('/admin/marketing/meta/status')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ configured: false, provider: 'meta' }) });
    }
    if (path.endsWith('/admin/seo-measurement')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    }
    if (path.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    if (path.endsWith('/categories') || path.endsWith('/category-attributes') || path.endsWith('/favorites')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ providers: { google: false, apple: false, telegram: false, sms: false } }) });
    }
    if (path.includes('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
}

async function expectDocumentLocale(page, lang) {
  await expect.poll(() => page.locator('html').getAttribute('lang')).toBe(lang === 'es' ? 'es-MX' : lang);
  await expect.poll(() => page.locator('html').getAttribute('dir')).toBe(lang === 'ar' ? 'rtl' : 'ltr');
}

for (const lang of SUPPORTED_LANGUAGES) {
  test(`Advertising Hub follows ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const copy = ADMIN_OPERATIONAL_COPY[lang].marketing;
    await installAdmin(page, lang);
    await mockApi(page);
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto('/admin/marketing?section=dashboard', { waitUntil: 'domcontentloaded' });

    await expectDocumentLocale(page, lang);
    await expect(page.getByText(copy.headerDesc, { exact: true })).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('marketing-section-dashboard')).toContainText(copy.sections.dashboard.label);
    await expect(page.getByText(copy.connectionsTitle, { exact: true })).toBeVisible();
    await expect(page.getByText(copy.noCampaigns, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
}

async function mockAdminRecoveryApi(page, recovered) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path.endsWith('/user') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminUser) });
    }

    const recoverySurface = path.endsWith('/users') ? 'users'
      : path.endsWith('/admin/ads/pending') ? 'moderation'
        : path.endsWith('/admin/coupons') ? 'coupons'
          : (path.endsWith('/admin/reports') || path.endsWith('/admin/user-reports')) ? 'reports'
            : path.endsWith('/admin/payments') ? 'payments'
              : null;

    if (recoverySurface && method === 'GET') {
      if (!recovered.has(recoverySurface)) {
        return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'temporarily unavailable' }) });
      }
      await new Promise(resolve => setTimeout(resolve, 650));
      if (recoverySurface === 'payments') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], last_page: 1, total: 0 }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }

    if (path.endsWith('/admin/analytics')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ revenue_period: 0, promotion_revenue_period: 0, ctr: 0, total_clicks: 0, total_impressions: 0 }) });
    }
    if (path.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    if (path.endsWith('/categories') || path.endsWith('/category-attributes') || path.endsWith('/favorites') || path.endsWith('/user/ads') || path.endsWith('/user/favorite-ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/user/payments')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], last_page: 1, total: 0 }) });
    }
    if (path.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ providers: { google: false, apple: false, telegram: false, sms: false } }) });
    }
    if (path.includes('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
}

const adminRecoverySurfaces = [
  { id: 'users', emptyTestId: 'admin-users-empty' },
  { id: 'moderation', emptyTestId: 'admin-moderation-empty' },
  { id: 'coupons', emptyTestId: 'admin-coupons-empty' },
  { id: 'reports', emptyTestId: 'admin-reports-ads-empty' },
  { id: 'payments', emptyTestId: 'admin-payments-empty' },
];

for (const lang of ['es', 'en']) {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`admin data tabs distinguish failure, retry loading and real empty in ${lang} on ${viewport.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-desktop');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installAdmin(page, lang);
      const recovered = new Set();
      await mockAdminRecoveryApi(page, recovered);
      await page.goto('/admin', { waitUntil: 'domcontentloaded' });
      await expectDocumentLocale(page, lang);
      const t = recoveryTranslations[lang];

      for (const surface of adminRecoverySurfaces) {
        await page.getByTestId(`admin-tab-${surface.id}`).click();
        await expect(page.getByTestId(`admin-${surface.id}-load-error`)).toContainText(t.connection_error);
        await expect(page.getByTestId(surface.emptyTestId)).toHaveCount(0);
        await expect(page.getByTestId(`admin-${surface.id}-retry`)).toHaveText(t.retry_btn);

        recovered.add(surface.id);
        await page.getByTestId(`admin-${surface.id}-retry`).click();
        await expect(page.getByTestId(`admin-${surface.id}-loading`)).toBeVisible();
        await expect(page.getByTestId(`admin-${surface.id}-load-error`)).toHaveCount(0);
        await expect(page.getByTestId(surface.emptyTestId)).toBeVisible();
      }
    });
  }
}
