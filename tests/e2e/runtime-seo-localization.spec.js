import { test, expect } from '@playwright/test';
import { getVerticalSeo } from '../../src/constants/verticalSeo.js';
import { getTranslations, loadLanguage } from '../../src/utils/translations.js';

const ad = {
  id: 42,
  title: 'QA Runtime SEO Phone',
  description: 'QA localized listing description',
  price: 1234,
  category: 'electronica',
  status: 'active',
  is_catalog_filler: false,
  expires_at: '2026-08-20T00:00:00Z',
  created_at: '2026-08-01T00:00:00Z',
  user_id: 77,
  user: { id: 77, name: 'QA SEO Seller', created_at: '2024-01-01T00:00:00Z' },
};

const seller = {
  id: 77,
  name: 'QA SEO Seller',
  role: 'private',
  city: 'Veracruz',
  bio: null,
  member_since: '2024-01-01T00:00:00Z',
  rating_avg: 0,
  rating_count: 0,
  active_ads: 0,
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
    if (path.endsWith('/ads/42/similar')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (path.endsWith('/ads/42/price-history')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ history: [] }) });
    if (path.endsWith('/ads/42')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ad) });
    if (path.endsWith('/users/77/profile')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(seller) });
    if (path.endsWith('/users/77/reviews')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reviews: [], average: 0, total: 0 }) });
    if (path.endsWith('/ads')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    if (path.endsWith('/categories') || path.endsWith('/category-attributes')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (path.endsWith('/auth/providers')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    if (path.endsWith('/banners')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ banners: [] }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function expectSeo(page, title, description) {
  await expect.poll(() => page.title()).toBe(title);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', description);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title);
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', description);
}

for (const lang of ['es', 'en', 'ru', 'ar', 'zh']) {
  for (const route of ['/electronica', '/autos']) {
    test(`${route} runtime SEO follows ${lang}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-desktop');
      await setLanguage(page, lang);
      await mockApi(page);
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const seo = getVerticalSeo(route, lang);
      await expectSeo(page, seo.title, seo.description);
    });
  }
}

for (const lang of ['en', 'ru', 'ar', 'zh']) {
  test(`ad detail runtime SEO stays language-neutral in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/ads/42', { waitUntil: 'domcontentloaded' });
    await expectSeo(page, `${ad.title} | Mercasto`, ad.description);
  });

  test(`seller runtime SEO uses localized fallback description in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await loadLanguage(lang);
    const t = getTranslations(lang);
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/vendedor/77', { waitUntil: 'domcontentloaded' });
    await expectSeo(page, `${seller.name} | Mercasto`, t.ai_brand_description);
  });
}
