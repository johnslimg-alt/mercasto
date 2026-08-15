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
  balance: 100,
  active_plan: { name: 'QA PRO', monthly_ad_limit: 25, expires_at: '2026-12-31' },
};
const ad = {
  id: 9,
  title: 'Toyota Corolla QA',
  price: 325000,
  status: 'active',
  views: 12345,
  impressions_count: 20000,
  whatsapp_clicks: 321,
  images: [],
};
const payment = {
  id: 55,
  description: 'QA credit purchase',
  amount: 1234.5,
  created_at: '2026-08-08T14:15:00Z',
};
const contact = {
  adId: 9,
  title: 'Toyota Corolla QA',
  image: null,
  channel: 'whatsapp',
  contactedAt: '2026-08-07T14:15:00Z',
};
async function installSession(page, lang) {
  await page.addInitScript(({ savedLang, savedUser, savedContact }) => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('auth_token', 'dashboard-locale-token');
    localStorage.setItem('user', JSON.stringify(savedUser));
    localStorage.setItem('mercasto_contact_history', JSON.stringify([savedContact]));
  }, { savedLang: lang, savedUser: user, savedContact: contact });
}

async function mockApi(page) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/user') && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    }
    if (url.pathname.endsWith('/user/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([ad]) });
    }
    if (url.pathname.endsWith('/user/favorite-ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.endsWith('/user/payments')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        data: [payment], last_page: 1, total: 1,
      }) });
    }
    if (url.pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        google: false, apple: false, sms: false, twitter: false, telegram: false,
      }) });
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

async function browserDate(page, lang, value) {
  return page.evaluate(({ locale, dateValue }) => {
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? `${dateValue}T00:00:00` : dateValue;
    return new Date(normalized).toLocaleDateString(locale);
  }, {
    locale: LOCALES[lang], dateValue: value,
  });
}
async function browserCurrency(page, lang, value) {
  return page.evaluate(({ locale, amount }) => new Intl.NumberFormat(locale, {
    style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount), { locale: LOCALES[lang], amount: value });
}

async function browserNumber(page, lang, value) {
  return page.evaluate(({ locale, amount }) => new Intl.NumberFormat(locale).format(amount), {
    locale: LOCALES[lang], amount: value,
  });
}

async function verifyDashboardLocale(page, lang, viewport) {
  const t = translations[lang];
  await page.setViewportSize(viewport);
  await mockApi(page);
  await installSession(page, lang);
  await page.goto('/profile');

  const planExpiry = page.getByTestId('dashboard-plan-expiry');
  await expect(planExpiry).toContainText(await browserDate(page, lang, '2026-12-31'));
  await expect(page.getByText(await browserCurrency(page, lang, 325000), { exact: true }).first()).toBeVisible();
  await expect(page.getByText(await browserNumber(page, lang, 12345), { exact: true }).first()).toBeVisible();
  await page.getByTestId('dashboard-tab-stats').click();
  await expect(page.getByText(t.trust_score, { exact: true })).toBeVisible();
  await expect(page.getByText(t.avg_response_under_2h, { exact: true })).toBeVisible();

  await page.getByTestId('dashboard-tab-transactions').click();
  const transaction = page.getByTestId('dashboard-transaction-55');
  await expect(transaction).toBeVisible();
  await expect(transaction).toContainText(await browserDate(page, lang, payment.created_at));
  await expect(transaction).toContainText(`+${await browserCurrency(page, lang, payment.amount)}`);

  await page.getByTestId('dashboard-tab-contact_history').click();
  await expect(page.getByText(t.contact_history_device_desc, { exact: true })).toBeVisible();
  const contactRow = page.getByTestId('contact-history-9');
  await expect(contactRow).toContainText(t.contacted_via);
  await expect(contactRow).toContainText(await browserDate(page, lang, contact.contactedAt));
  await expect(contactRow.getByRole('link')).toContainText(t.view);

  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(lang === 'es' ? 'es-MX' : lang);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}
for (const lang of LANGUAGES) {
  test(`dashboard locale formatting renders ${lang} on desktop`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await verifyDashboardLocale(page, lang, { width: 1440, height: 900 });
  });
}

for (const lang of LANGUAGES) {
  test(`dashboard locale formatting renders ${lang} on mobile`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await verifyDashboardLocale(page, lang, { width: 390, height: 844 });
  });
}

async function mockPaymentRecoveryApi(page, shouldRecover) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/user') && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    }
    if (url.pathname.endsWith('/user/payments')) {
      if (!shouldRecover()) {
        return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'temporarily unavailable' }) });
      }
      await new Promise(resolve => setTimeout(resolve, 700));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], last_page: 1, total: 0 }) });
    }
    if (url.pathname.endsWith('/user/ads') || url.pathname.endsWith('/user/favorite-ads') || url.pathname.endsWith('/categories')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false, twitter: false, telegram: false }) });
    }
    if (url.pathname.includes('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

for (const lang of ['es', 'en']) {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`transactions distinguish failure, retry loading and empty in ${lang} on ${viewport.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-desktop');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installSession(page, lang);
      let recover = false;
      await mockPaymentRecoveryApi(page, () => recover);

      await page.goto('/profile?tab=transactions');
      const t = translations[lang];
      await expect(page.getByTestId('dashboard-transactions-load-error')).toContainText(t.connection_error);
      await expect(page.getByTestId('dashboard-transactions-empty')).toHaveCount(0);
      await expect(page.getByTestId('dashboard-transactions-retry')).toHaveText(t.retry_btn);

      recover = true;
      await page.getByTestId('dashboard-transactions-retry').click();
      await expect(page.getByTestId('dashboard-transactions-loading')).toBeVisible();
      await expect(page.getByTestId('dashboard-transactions-load-error')).toHaveCount(0);
      await expect(page.getByTestId('dashboard-transactions-empty')).toContainText(t.no_transactions_yet);
    });
  }
}

async function mockFavoriteRecoveryApi(page, shouldRecover) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/user') && request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    if (url.pathname.endsWith('/user/favorite-ads')) {
      if (!shouldRecover()) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'temporarily unavailable' }) });
      await new Promise(resolve => setTimeout(resolve, 700));
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.endsWith('/user/ads') || url.pathname.endsWith('/categories')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (url.pathname.endsWith('/user/payments')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], last_page: 1, total: 0 }) });
    if (url.pathname.endsWith('/auth/providers')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false, twitter: false, telegram: false }) });
    if (url.pathname.includes('/notifications')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

for (const lang of ['es', 'en']) {
  for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
    test(`favorites distinguish failure, retry loading and empty in ${lang} on ${viewport.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-desktop');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installSession(page, lang);
      let recover = false;
      await mockFavoriteRecoveryApi(page, () => recover);
      await page.goto('/profile?tab=favorites');
      const t = translations[lang];
      await expect(page.getByTestId('dashboard-favorites-load-error')).toContainText(t.connection_error);
      await expect(page.getByTestId('dashboard-favorites-empty')).toHaveCount(0);
      await expect(page.getByTestId('dashboard-favorites-retry')).toHaveText(t.retry_btn);
      recover = true;
      await page.getByTestId('dashboard-favorites-retry').click();
      await expect(page.getByTestId('dashboard-favorites-loading')).toBeVisible();
      await expect(page.getByTestId('dashboard-favorites-load-error')).toHaveCount(0);
      await expect(page.getByTestId('dashboard-favorites-empty')).toContainText(t.no_favorites_yet);
    });
  }
}
