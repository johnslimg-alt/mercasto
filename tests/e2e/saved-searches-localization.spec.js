import { expect, test } from '@playwright/test';

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

const user = {
  id: 91,
  name: 'QA User',
  email: 'qa@example.test',
  role: 'individual',
  is_verified: true,
  account_verified: true,
};
const savedSearch = {
  id: 77,
  name: 'iPhone QA',
  query: 'iphone',
  category_slug: 'productos',
  state: 'Veracruz',
  city: 'Boca del Río',
  min_price: 1000,
  max_price: 5000,
  is_active: true,
};

async function installSession(page, lang) {
  await page.addInitScript(({ savedLang, savedUser }) => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('auth_token', 'saved-search-localization-token');
    localStorage.setItem('user', JSON.stringify(savedUser));
  }, { savedLang: lang, savedUser: user });
}

async function mockApi(page, counters) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/user') && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    }
    if (url.pathname.endsWith('/user/search-alerts') && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([savedSearch]) });
    }
    if (url.pathname.endsWith('/user/search-alerts/77') && request.method() === 'PATCH') {
      counters.patch += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...savedSearch, is_active: false }) });
    }
    if (url.pathname.endsWith('/user/search-alerts/77') && request.method() === 'DELETE') {
      counters.delete += 1;
      return route.fulfill({ status: 204, body: '' });
    }
    if (url.pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    if (url.pathname.endsWith('/categories')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.includes('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function browserCurrency(page, lang, value) {
  return page.evaluate(({ locale, amount }) => new Intl.NumberFormat(locale, {
    style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount), { locale: LOCALES[lang], amount: value });
}

async function verifySavedSearches(page, lang, viewport) {
  const t = translations[lang];
  const counters = { patch: 0, delete: 0 };
  await page.setViewportSize(viewport);
  await mockApi(page, counters);
  await installSession(page, lang);
  await page.goto('/profile');
  await page.getByTestId('dashboard-tab-saved_searches').click();

  await expect(page.getByRole('heading', { name: new RegExp(t.saved_searches_title) })).toBeVisible();
  const card = page.getByTestId('saved-search-card-77');
  await expect(card).toBeVisible();
  await expect(card.getByText('iPhone QA', { exact: true })).toBeVisible();
  await expect(card).toContainText(await browserCurrency(page, lang, 1000));
  await expect(card).toContainText(await browserCurrency(page, lang, 5000));

  const toggle = page.getByTestId('saved-search-alert-toggle-77');
  await expect(toggle).toHaveAttribute('aria-label', t.deactivate_alerts);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-label', t.activate_alerts);
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(counters.patch).toBe(1);

  let confirmMessage = null;
  page.once('dialog', async dialog => {
    confirmMessage = dialog.message();
    await dialog.dismiss();
  });
  const deleteButton = page.getByTestId('saved-search-delete-77');
  await expect(deleteButton).toHaveAttribute('aria-label', t.delete_search);
  await deleteButton.click();
  await expect.poll(() => confirmMessage).toBe(t.delete_confirm);
  expect(counters.delete).toBe(0);

  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(lang === 'es' ? 'es-MX' : lang);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

for (const lang of LANGUAGES) {
  test(`saved searches localization renders ${lang} on desktop`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await verifySavedSearches(page, lang, { width: 1440, height: 900 });
  });
}
for (const lang of LANGUAGES) {
  test(`saved searches localization renders ${lang} on mobile`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await verifySavedSearches(page, lang, { width: 390, height: 844 });
  });
}
