import { expect, test } from '@playwright/test';
import { ADMIN_OPERATIONAL_COPY } from '../../src/utils/adminOperationalCopy.js';
import { SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';
import { formatNumber } from '../../src/utils/localeFormat.js';

const adminUser = {
  id: 992,
  name: 'Admin CRO QA',
  email: 'admin-cro@example.test',
  role: 'admin',
  is_verified: true,
};

const report = {
  period_start: '2026-08-07',
  period_end: '2026-08-14',
  generated_at: '2026-08-14T18:00:00Z',
  external_complete: false,
  report: {
    internal: {
      current: {
        new_users: 12,
        verified_new_users: 9,
        first_publishers: 5,
        registration_to_first_publish_percent: 41.7,
        genuine_listing_views: 240,
        genuine_contact_clicks: 36,
        distinct_contacted_listings: 21,
        view_to_contact_percent: 15,
        internal_conversations_started: 8,
        seller_replied_conversations: 6,
        seller_response_rate_percent: 75,
        median_first_response_minutes: 18.5,
        seller_replies_within_2h_percent: 62.5,
      },
      previous: {},
      change_percent: {},
    },
    supply: {
      summary: {
        active_genuine: 42,
        active_sellers: 18,
        ready_for_seller_confirmation: 3,
      },
      national_qualification: { qualified: false, checks: {} },
      qualified_categories: 1,
      qualified_state_categories: 0,
      qualified_city_categories: 0,
    },
    indexability: {
      indexable_genuine_listing_urls: 39,
      active_catalog_references_noindex: 100,
      source_pages: 6,
      location_routes_open: 0,
    },
    external: {
      readiness: {
        search_console_configured: false,
        ga4_data_configured: false,
      },
      search_console: { status: 'not_configured' },
      ga4: { status: 'not_configured' },
      external_complete: false,
    },
    privacy_clear: true,
  },
};

async function installAdmin(page, lang) {
  await page.addInitScript(({ savedLang, user }) => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('auth_token', 'admin-cro-token');
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
    if (path.endsWith('/admin/seo-measurement')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [report], meta: { count: 1, privacy_contract: 'aggregate_only' } }),
      });
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
for (const lang of SUPPORTED_LANGUAGES) {
  test(`first-response measurement renders aggregate KPIs in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const copy = ADMIN_OPERATIONAL_COPY[lang].seo;
    await installAdmin(page, lang);
    await mockApi(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('admin-tab-seo_geo').click();

    await expect.poll(() => page.locator('html').getAttribute('lang')).toBe(lang === 'es' ? 'es-MX' : lang);
    await expect.poll(() => page.locator('html').getAttribute('dir')).toBe(lang === 'ar' ? 'rtl' : 'ltr');
    await expect(page.getByRole('paragraph').filter({ hasText: copy.internalChats }).first()).toBeVisible();
    await expect(page.getByRole('paragraph').filter({ hasText: copy.sellerResponseRate }).first()).toBeVisible();
    await expect(page.getByRole('paragraph').filter({ hasText: copy.medianFirstResponse }).first()).toBeVisible();
    await expect(page.getByText(`${formatNumber(6, lang)} ${copy.sellerReplies}`, { exact: true })).toBeVisible();
    await expect(page.getByText(`${formatNumber(62.5, lang, { maximumFractionDigits: 1 })}% ${copy.within2h}`, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
}
