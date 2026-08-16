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
    localStorage.setItem('cookie_consent', 'essential');
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

async function mockMyAdsRecoveryApi(page, shouldRecover) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/user') && request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    if (url.pathname.endsWith('/user/ads')) {
      if (!shouldRecover()) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'temporarily unavailable' }) });
      await new Promise(resolve => setTimeout(resolve, 700));
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.endsWith('/user/favorite-ads') || url.pathname.endsWith('/categories')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (url.pathname.endsWith('/user/payments')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], last_page: 1, total: 0 }) });
    if (url.pathname.endsWith('/auth/providers')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false, twitter: false, telegram: false }) });
    if (url.pathname.includes('/notifications')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

for (const lang of ['es', 'en']) {
  for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
    test(`my ads distinguish failure, retry loading and empty in ${lang} on ${viewport.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-desktop');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installSession(page, lang);
      let recover = false;
      await mockMyAdsRecoveryApi(page, () => recover);
      await page.goto('/profile?tab=my_ads');
      const t = translations[lang];
      await expect(page.getByTestId('dashboard-my-ads-load-error')).toContainText(t.connection_error);
      await expect(page.getByTestId('dashboard-my-ads-empty')).toHaveCount(0);
      await expect(page.getByTestId('dashboard-my-ads-retry')).toHaveText(t.retry_btn);
      recover = true;
      await page.getByTestId('dashboard-my-ads-retry').click();
      await expect(page.getByTestId('dashboard-my-ads-loading')).toBeVisible();
      await expect(page.getByTestId('dashboard-my-ads-load-error')).toHaveCount(0);
      await expect(page.getByTestId('dashboard-my-ads-empty')).toContainText(t.noAds);
    });
  }
}

async function mockAnalyticsRecoveryApi(page, shouldRecover) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/user') && request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    if (url.pathname.endsWith('/user/analytics')) {
      if (!shouldRecover()) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'temporarily unavailable' }) });
      await new Promise(resolve => setTimeout(resolve, 700));
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.endsWith('/user/ads') || url.pathname.endsWith('/user/favorite-ads') || url.pathname.endsWith('/categories')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (url.pathname.endsWith('/user/payments')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], last_page: 1, total: 0 }) });
    if (url.pathname.endsWith('/auth/providers')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false, twitter: false, telegram: false }) });
    if (url.pathname.includes('/notifications')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

for (const lang of ['es', 'en']) {
  for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
    test(`analytics distinguish failure, retry loading and empty data in ${lang} on ${viewport.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-desktop');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installSession(page, lang);
      let recover = false;
      await mockAnalyticsRecoveryApi(page, () => recover);
      await page.goto('/profile?tab=stats');
      await page.getByRole('button', { name: 'PRO', exact: true }).click();
      const t = translations[lang];
      await expect(page.getByTestId('dashboard-analytics-load-error')).toContainText(t.connection_error);
      await expect(page.getByTestId('dashboard-analytics-content')).toHaveCount(0);
      await expect(page.getByTestId('dashboard-analytics-retry')).toHaveText(t.retry_btn);
      recover = true;
      await page.getByTestId('dashboard-analytics-retry').click();
      await expect(page.getByTestId('dashboard-analytics-loading')).toBeVisible();
      await expect(page.getByTestId('dashboard-analytics-load-error')).toHaveCount(0);
      await expect(page.getByTestId('dashboard-analytics-content')).toBeVisible();
    });
  }
}

for (const lang of ['es', 'en']) {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`privacy switches expose state and work from keyboard in ${lang} on ${viewport.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-desktop');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installSession(page, lang);
      await mockApi(page);
      await page.goto('/profile?tab=privacy');
      const t = translations[lang];

      const profileSwitch = page.getByRole('switch', { name: t.profile_visible_title });
      const trackingSwitch = page.getByRole('switch', { name: t.gdpr_analytics_title });
      await expect(profileSwitch).toHaveAttribute('aria-checked', 'true');
      await expect(trackingSwitch).toHaveAttribute('aria-checked', 'true');

      await profileSwitch.focus();
      await expect(profileSwitch).toBeFocused();
      await page.keyboard.press('Space');
      await expect(profileSwitch).toHaveAttribute('aria-checked', 'false');
      await expect.poll(() => page.evaluate(() => localStorage.getItem('mercasto_privacy_profile_visible'))).toBe('false');

      await trackingSwitch.focus();
      await expect(trackingSwitch).toBeFocused();
      await page.keyboard.press('Space');
      await expect(trackingSwitch).toHaveAttribute('aria-checked', 'false');
      await expect.poll(() => page.evaluate(() => localStorage.getItem('mercasto_privacy_tracking_consent'))).toBe('false');
    });
  }
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`dashboard review rating is keyboard-operable on ${viewport.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installSession(page, 'es');
    await mockApi(page);
    await page.goto('/profile?tab=reviews');

    const oneStar = page.getByRole('button', { name: '1 / 5' }).first();
    const fiveStars = page.getByRole('button', { name: '5 / 5' }).first();
    await expect(oneStar).toBeVisible();
    await expect(fiveStars).toHaveAttribute('aria-pressed', 'false');
    await oneStar.focus();
    await expect(oneStar).toBeFocused();
    await page.keyboard.press('Space');
    await expect(oneStar).toHaveAttribute('aria-pressed', 'true');
  });
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`achievements dialog traps focus and restores its opener on ${viewport.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installSession(page, 'en');
    await mockApi(page);
    await page.goto('/profile');
    const t = translations.en;

    const opener = page.getByRole('button', { name: t.achievements, exact: true });
    await opener.focus();
    await opener.click();
    const dialog = page.locator('[role="dialog"][aria-labelledby="achievements-title"]');
    const closeButton = dialog.getByRole('button', { name: t.close_btn || t.close, exact: true });
    await expect(dialog).toBeVisible();
    await expect(closeButton).toBeFocused();
    await closeButton.press('Shift+Tab');
    await expect.poll(() => dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`authenticated dashboard form controls have accessible names on ${viewport.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installSession(page, 'en');
    await mockApi(page);
    await page.goto('/profile');
    const tabs = ['my_ads', 'favorites', 'saved_searches', 'stats', 'transactions', 'contact_history', 'reviews', 'privacy', 'settings'];
    const unnamed = [];
    for (const tab of tabs) {
      const button = page.getByTestId(`dashboard-tab-${tab}`);
      if (await button.count()) await button.click();
      const controls = await page.locator('input:visible:not([type="hidden"]), select:visible, textarea:visible').evaluateAll((elements) => elements.map((element) => {
        const id = element.id;
        const explicitLabel = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
        const wrappingLabel = element.closest('label');
        return {
          aria: (element.getAttribute('aria-label') || '').trim(),
          labelledby: (element.getAttribute('aria-labelledby') || '').trim(),
          title: (element.getAttribute('title') || '').trim(),
          label: (explicitLabel?.textContent || wrappingLabel?.textContent || '').trim(),
          html: element.outerHTML.slice(0, 240),
        };
      }));
      controls.forEach(control => {
        if (!control.aria && !control.labelledby && !control.title && !control.label) unnamed.push({ tab, html: control.html });
      });
    }
    expect(unnamed, `unnamed authenticated dashboard form controls: ${JSON.stringify(unnamed, null, 2)}`).toEqual([]);
  });
}



for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`2FA setup code control has a localized accessible name on ${viewport.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installSession(page, 'en');
    await mockApi(page);
    await page.route('**/api/user/two-factor-authentication', async route => {
      if (route.request().method() !== 'POST') return route.fallback();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        qr_code_url: 'otpauth://totp/Mercasto:qa@example.test?secret=JBSWY3DPEHPK3PXP&issuer=Mercasto',
        recovery_codes: ['qa-recovery-code'],
      }) });
    });
    await page.goto('/profile');
    await page.getByTestId('dashboard-tab-settings').click();
    const t = translations.en;
    await page.getByRole('button', { name: t.twofa_enable, exact: true }).click();
    await expect(page.getByRole('textbox', { name: t.auth_code_placeholder, exact: true })).toBeVisible();
  });
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`authenticated dashboard buttons and links expose accessible names on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockApi(page);
    await installSession(page, 'es');
    await page.goto('/profile');
    const tabs = ['my_ads','favorites','saved_searches','stats','transactions','contact_history','reviews','privacy','settings'];
    const unnamed = [];
    for (const tabId of tabs) {
      await page.getByTestId(`dashboard-tab-${tabId}`).click();
      await page.waitForTimeout(30);
      const items = await page.locator('button:visible, a[href]:visible').evaluateAll(nodes => nodes.map(node => ({
        tag: node.tagName.toLowerCase(), text:(node.innerText||'').trim(), aria:(node.getAttribute('aria-label')||'').trim(), labelledby:(node.getAttribute('aria-labelledby')||'').trim(), title:(node.getAttribute('title')||'').trim(), html:node.outerHTML.slice(0,260)
      })));
      for (const item of items) if (!(item.text || item.aria || item.labelledby || item.title)) unnamed.push({ tab: tabId, ...item });
    }
    expect(unnamed, `unnamed dashboard actions: ${JSON.stringify(unnamed, null, 2)}`).toEqual([]);
  });
}


for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`business company dashboard controls expose accessible names on ${viewport.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const businessUser = { ...user, role: 'business' };
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript(({ savedUser }) => {
      localStorage.setItem('lang', 'es');
      localStorage.setItem('mercasto_language', 'es');
      localStorage.setItem('cookiesAccepted', 'true');
      localStorage.setItem('cookie_consent', 'essential');
      localStorage.setItem('auth_token', 'business-company-control-token');
      localStorage.setItem('user', JSON.stringify(savedUser));
    }, { savedUser: businessUser });
    await page.route('**/api/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path.endsWith('/user') && request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(businessUser) });
      if (path.endsWith('/user/business-profile')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: true, business_name: 'QA Negocio', business_rfc: 'XAXX010101000', business_description: 'QA business', business_hours: [] }) });
      if (path.endsWith('/auth/providers')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
      if (path.endsWith('/categories') || path.endsWith('/user/ads') || path.endsWith('/user/favorite-ads')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      if (path.includes('/notifications')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/profile');
    await expect(page.getByTestId('dashboard-tab-company')).toBeVisible();
    await page.getByTestId('dashboard-tab-company').click();
    await expect(page.getByRole('heading', { name: /Registro de empresa/i })).toBeVisible();
    const unnamed = await page.locator('button:visible, a[href]:visible, input:visible, select:visible, textarea:visible').evaluateAll(nodes => nodes.flatMap(node => {
      const tag = node.tagName.toLowerCase();
      const id = node.id || '';
      const explicitLabel = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.innerText?.trim() || '' : '';
      const wrappingLabel = node.closest('label')?.innerText?.trim() || '';
      const nativeTextName = tag === 'button' || tag === 'a' ? (node.innerText || '').trim() : '';
      const named = nativeTextName || (node.getAttribute('aria-label') || '').trim() || (node.getAttribute('aria-labelledby') || '').trim() || (node.getAttribute('title') || '').trim() || explicitLabel || wrappingLabel;
      if (named || node.getAttribute('type') === 'hidden') return [];
      return [{ tag, type: node.getAttribute('type') || '', placeholder: node.getAttribute('placeholder') || '', html: node.outerHTML.slice(0, 320) }];
    }));
    expect(unnamed, `unnamed business company controls: ${JSON.stringify(unnamed, null, 2)}`).toEqual([]);
  });
}
