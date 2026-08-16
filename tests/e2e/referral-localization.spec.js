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

const referralUrl = 'https://mercasto.com/r/AB12CD34';
const referralPayload = {
  code: 'AB12CD34',
  referral_url: referralUrl,
  total_referrals: 2,
  pending_rewards: 1,
  credits: 5,
  referrals: [
    { name: 'Ana G.', joined_at: '2026-08-01', status: 'completed' },
    { name: 'Luis P.', joined_at: '2026-08-02', status: 'pending' },
  ],
};
async function mockReferralApi(page) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/user')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        id: 91, name: 'QA User', email: 'qa@example.test', role: 'individual',
        is_verified: true, account_verified: true,
      }) });
    }
    if (url.pathname.endsWith('/referral/apply')) {
      const data = request.postDataJSON();
      const success = data.code === 'GOOD1234';
      return route.fulfill({
        status: success ? 200 : 404,
        contentType: 'application/json',
        body: JSON.stringify(success
          ? { success: true, code: 'applied', message: 'Código aplicado!' }
          : { success: false, code: 'invalid_code', message: 'Código de referido inválido.' }),
      });
    }
    if (url.pathname.endsWith('/referral')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(referralPayload) });
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

async function installSession(page, lang) {
  await page.addInitScript(({ savedLang }) => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('auth_token', 'referral-localization-token');
    localStorage.setItem('user', JSON.stringify({
      id: 91, name: 'QA User', email: 'qa@example.test', role: 'individual',
      is_verified: true, account_verified: true,
    }));
    window.open = url => { window.__referralOpenedUrl = String(url); return null; };
  }, { savedLang: lang });
}

async function expectedDate(page, lang, value) {
  return page.evaluate(({ locale, dateValue }) => new Date(`${dateValue}T00:00:00`).toLocaleString(locale, {
    year: 'numeric', month: 'short', day: 'numeric',
  }), { locale: LOCALES[lang], dateValue: value });
}
async function verifyReferral(page, lang, viewport) {
  const t = translations[lang];
  await page.setViewportSize(viewport);
  await mockReferralApi(page);
  await installSession(page, lang);
  await page.goto('/referidos');

  await expect(page.getByRole('heading', { name: t.referral_title })).toBeVisible();
  await expect(page.getByRole('textbox', { name: t.referral_link, exact: true })).toHaveValue(referralUrl);
  await expect(page.getByTestId('referral-status-completed')).toContainText(t.referral_status_completed);
  await expect(page.getByTestId('referral-status-pending')).toHaveText(t.referral_status_pending);
  await expect(page.getByText(await expectedDate(page, lang, '2026-08-01'), { exact: true })).toBeVisible();

  await page.getByTestId('referral-share-whatsapp').click();
  const openedUrl = await page.evaluate(() => window.__referralOpenedUrl);
  const sharedText = new URL(openedUrl).searchParams.get('text');
  expect(sharedText).toBe(t.referral_share_message.replace('{url}', referralUrl));

  await page.getByTestId('referral-code-input').fill('BAD12345');
  await page.getByTestId('referral-code-apply').click();
  await expect(page.getByTestId('referral-apply-status')).toHaveText(t.referral_apply_invalid);
  await expect(page.getByTestId('referral-apply-status')).toHaveClass(/text-red-500/);

  await page.getByTestId('referral-code-input').fill('GOOD1234');
  await page.getByTestId('referral-code-apply').click();
  await expect(page.getByTestId('referral-apply-status')).toHaveText(t.referral_apply_success);
  await expect(page.getByTestId('referral-apply-status')).toHaveClass(/text-lime-600/);
  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(lang === 'es' ? 'es-MX' : lang);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  if (lang !== 'es') {
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('Código de referido inválido.');
    expect(body).not.toContain('No puedes usar tu propio código.');
  }
}

for (const lang of LANGUAGES) {
  test(`referral localization renders ${lang} on desktop`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await verifyReferral(page, lang, { width: 1440, height: 900 });
  });
}

for (const lang of LANGUAGES) {
  test(`referral localization renders ${lang} on mobile`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await verifyReferral(page, lang, { width: 390, height: 844 });
  });
}
