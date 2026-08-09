import { test, expect } from '@playwright/test';

const LANGUAGES = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja'];
const RTL_LANGUAGES = new Set(['ar']);
const LOCALES = {
  es: 'es-MX', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', zh: 'zh-CN', ko: 'ko-KR',
  de: 'de-DE', it: 'it-IT', ar: 'ar-MX', he: 'he-IL', yi: 'yi', ru: 'ru-RU', ja: 'ja-JP',
};
const translations = {};
for (const lang of LANGUAGES) {
  translations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

const notification = {
  id: 17,
  type: 'price_drop',
  is_read: 0,
  created_at: '2026-08-08T08:15:00Z',
  data: { ad_title: 'Toyota Corolla', old_price: 325000, new_price: 299500 },
};
async function mockAuthenticatedNotifications(page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/user')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 91, name: 'QA User', role: 'individual', is_verified: true }) });
    }
    if (url.pathname.endsWith('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [notification], next_page_url: null }) });
    }
    if (url.pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    if (url.pathname.endsWith('/categories')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function installSession(page, lang) {
  await page.addInitScript(({ savedLang }) => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('auth_token', 'notifications-localization-test-token');
    localStorage.setItem('user', JSON.stringify({ id: 91, name: 'QA User', role: 'individual', is_verified: true }));
    localStorage.setItem('cookiesAccepted', 'true');
  }, { savedLang: lang });
}
async function verifyNotifications(page, lang, viewport) {
  await page.setViewportSize(viewport);
  await mockAuthenticatedNotifications(page);
  await installSession(page, lang);
  await page.goto('/notificaciones');

  const t = translations[lang];
  await expect(page.getByRole('heading', { name: t.notifications_title })).toBeVisible();
  await expect(page.getByText(`${t.notifications_price_drop_prefix} Toyota Corolla`, { exact: true })).toBeVisible();
  await expect(page.getByText(t.notifications_mark_all, { exact: true })).toBeVisible();
  const oldPrice = await page.evaluate(({ locale, value }) => new Intl.NumberFormat(locale, {
    style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value), { locale: LOCALES[lang], value: notification.data.old_price });
  await expect(page.getByText(oldPrice, { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(lang === 'es' ? 'es-MX' : lang);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

for (const lang of LANGUAGES) {
  test(`notifications localization renders ${lang} on desktop`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await verifyNotifications(page, lang, { width: 1440, height: 900 });
  });
}
for (const lang of LANGUAGES) {
  test(`notifications localization renders ${lang} on mobile`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await verifyNotifications(page, lang, { width: 390, height: 844 });
  });
}
