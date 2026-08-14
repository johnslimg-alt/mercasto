import { expect, test } from '@playwright/test';
import { SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';
import { ONBOARDING_EXPERIENCE_COPY } from '../../src/utils/onboardingExperienceCopy.js';

const user = {
  id: 991397,
  name: 'Onboarding QA',
  email: 'onboarding-locale@example.test',
  role: 'individual',
  phone_verified: false,
  onboarding_completed_at: null,
  onboarding_skipped_at: null,
};

async function prepare(page, lang) {
  const payloads = [];
  await page.addInitScript(({ savedUser, language }) => {
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('auth_token', 'onboarding-locale-token');
    localStorage.setItem('user', JSON.stringify(savedUser));
    localStorage.setItem('just_registered', '1');
    localStorage.setItem('lang', language);
    localStorage.setItem('mercasto_language', language);
    localStorage.removeItem('onboarding_done');
    localStorage.removeItem('onboarding_done_user_id');
    localStorage.removeItem('onboarding_pending_sync');
  }, { savedUser: user, language: lang });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/api/user/preferences' && request.method() === 'POST') {
      payloads.push(request.postDataJSON());
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
    }
    if (path === '/api/user' && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    }
    if (path === '/api/auth/providers') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"sms":false}' });
    }
    if (path === '/api/categories') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path === '/api/ads' || path.startsWith('/api/ads/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[],"total":0}' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  return payloads;
}

for (const lang of SUPPORTED_LANGUAGES) {
  test(`onboarding experience follows ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const copy = ONBOARDING_EXPERIENCE_COPY[lang];
    const t = (await import(`../../src/constants/translations/${lang}.js`)).default;
    const payloads = await prepare(page, lang);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(copy.pricingFree, { exact: true })).toBeVisible();
    await expect(dialog.getByText(copy.pricingRenew, { exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(lang === 'es' ? 'es-MX' : lang);
    await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(lang === 'ar' ? 'rtl' : 'ltr');

    await dialog.getByRole('button', { name: t.next_btn }).click();
    await expect(dialog.getByText(copy.roleTitle, { exact: true })).toBeVisible();
    await dialog.getByText(copy.roles.seller[0], { exact: true }).click();
    await dialog.getByRole('button', { name: t.next_btn }).click();
    await expect(dialog.getByText(copy.interestsTitle, { exact: true })).toBeVisible();
    await expect(dialog.getByText(copy.interestsOptional, { exact: true })).toBeVisible();
    for (const label of Object.values(copy.interests)) {
      await expect(dialog.getByText(label, { exact: true })).toBeVisible();
    }

    await dialog.getByRole('button', { name: t.close_btn }).click();
    await expect(dialog).toHaveCount(0);
    expect(payloads).toHaveLength(1);
    expect(payloads[0]).toEqual({
      preferred_role: 'seller',
      preferred_categories: [],
      onboarding_resolution: 'skipped',
    });
  });
}
