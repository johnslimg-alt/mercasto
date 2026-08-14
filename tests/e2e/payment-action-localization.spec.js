import { test, expect } from '@playwright/test';
import { formatMXN } from '../../src/utils/localeFormat.js';
import { formatPaymentActionCopy } from '../../src/utils/paymentActionCopy.js';
import { SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';

const languages = SUPPORTED_LANGUAGES;
const translations = {};
for (const lang of languages) {
  translations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

function qaUser() {
  return {
    id: 4242,
    name: 'QA Seller',
    email: 'qa-seller@example.com',
    role: 'individual',
    balance: 500,
    unlimited_balance: false,
    email_verified_at: '2026-08-14T00:00:00Z',
    onboarding_completed_at: '2026-08-14T00:00:00Z',
  };
}

async function setAuthenticatedLanguage(page, lang) {
  await page.addInitScript(({ language, user }) => {
    localStorage.setItem('lang', language);
    localStorage.setItem('mercasto_language', language);
    localStorage.setItem('auth_token', 'qa-token');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('cookiesAccepted', 'true');
  }, { language: lang, user: qaUser() });
}

async function mockAuthenticatedApi(page) {
  const user = qaUser();
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/user')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    }
    if (path.endsWith('/user/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    }
    if (path.endsWith('/user/payments')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], current_page: 1, last_page: 1, total: 0 }) });
    }
    if (path.endsWith('/categories') || path.endsWith('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    if (path.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

for (const lang of languages) {
  test(`balance payment confirmation follows ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const t = translations[lang];
    await setAuthenticatedLanguage(page, lang);
    await mockAuthenticatedApi(page);
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });

    const pricingButton = page.getByRole('button', { name: t.view_plans, exact: true });
    await expect(pricingButton).toBeVisible();
    await pricingButton.click();

    const planHeading = page.getByRole('heading', { name: t.pm_plan_impulso, exact: true });
    await expect(planHeading).toBeVisible();
    const planCard = planHeading.locator('..');
    const expected = formatPaymentActionCopy(lang, 'payWithBalance', {
      amount: formatMXN(99, lang, { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
      balance: formatMXN(500, lang, { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    });

    let dialogText = '';
    page.once('dialog', async dialog => {
      dialogText = dialog.message();
      await dialog.dismiss();
    });
    await planCard.getByRole('button', { name: t.pm_get_plan, exact: true }).click();
    await expect.poll(() => dialogText).toBe(expected);
    if (lang !== 'es') expect(dialogText).not.toContain('Saldo actual');
    if (lang === 'ar') await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
}
