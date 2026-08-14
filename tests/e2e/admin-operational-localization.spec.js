import { expect, test } from '@playwright/test';
import { ADMIN_OPERATIONAL_COPY } from '../../src/utils/adminOperationalCopy.js';
import { SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';

const adminUser = { id: 991, name: 'Admin QA', email: 'admin-qa@example.test', role: 'admin', is_verified: true };

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
