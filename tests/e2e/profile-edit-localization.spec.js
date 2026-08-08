import { expect, test } from '@playwright/test';

const LANGUAGES = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'he', 'yi', 'ru', 'ja'];
const RTL_LANGUAGES = new Set(['ar', 'he', 'yi']);
const LOCALES = {
  es: 'es-MX', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', zh: 'zh-CN', ko: 'ko-KR',
  de: 'de-DE', it: 'it-IT', ar: 'ar-MX', he: 'he-IL', yi: 'yi', ru: 'ru-RU', ja: 'ja-JP',
};
const translations = {};
for (const lang of LANGUAGES) {
  translations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

const profile = {
  id: 91,
  name: 'QA User',
  email: 'qa@example.test',
  role: 'individual',
  account_verified: true,
  is_verified: true,
  bio: 'QA profile',
  city: 'Veracruz',
  phone_number: '+525512345678',
  whatsapp: '',
  website: '',
  social_instagram: '',
  avatar_url: null,
  member_since: '2026-08-01',
  password_set: true,
  is_oauth_only: false,
  phone_verified: false,
  notification_preferences: { email_ad_reply: true, push_enabled: false },
};

async function installSession(page, lang) {
  await page.addInitScript(({ savedLang, savedProfile }) => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('auth_token', 'profile-edit-localization-token');
    localStorage.setItem('user', JSON.stringify(savedProfile));
  }, { savedLang: lang, savedProfile: profile });
}

async function mockProfileApi(page) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/user/profile') && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profile) });
    }
    if (url.pathname.endsWith('/user') && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profile) });
    }
    if (url.pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: true }) });
    }
    if (url.pathname.endsWith('/user/business-profile')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }
    if (url.pathname.endsWith('/categories')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.includes('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    }
    if (request.method() === 'DELETE') {
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'SHOULD_NOT_BE_CALLED' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function localizedMemberDate(page, lang) {
  return page.evaluate(({ locale }) => new Date('2026-08-01T00:00:00').toLocaleString(locale, {
    year: 'numeric', month: 'long', day: 'numeric',
  }), { locale: LOCALES[lang] });
}

async function verifyProfileEdit(page, lang, viewport) {
  const t = translations[lang];
  let deleteRequests = 0;
  page.on('request', request => {
    if (request.method() === 'DELETE' && new URL(request.url()).pathname.endsWith('/api/user')) deleteRequests += 1;
  });

  await page.setViewportSize(viewport);
  await mockProfileApi(page);
  await installSession(page, lang);
  await page.goto('/perfil/editar');

  await expect(page.getByRole('heading', { name: t.edit_profile })).toBeVisible();
  await expect(page.getByRole('button', { name: t.back })).toBeVisible();
  await expect(page.getByLabel(t.change_photo)).toBeVisible();
  await expect(page.getByText(t.phone_verification, { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: t.business_profile })).toBeVisible();
  await expect(page.getByTestId('profile-member-since')).toContainText(await localizedMemberDate(page, lang));

  const newPassword = page.getByPlaceholder(t.new_password, { exact: true });
  const confirmPassword = page.getByPlaceholder(t.conf_password, { exact: true });
  await newPassword.fill('abcdefgh');
  await confirmPassword.fill('abcdzzzz');
  await page.getByRole('button', { name: t.update_pass_btn }).click();
  await expect(page.getByText(t.passwords_mismatch, { exact: true })).toBeVisible();

  await page.getByTestId('profile-delete-open').click();
  const dialog = page.getByRole('dialog', { name: t.delete_account_confirm });
  await expect(dialog).toBeVisible();
  const confirmInput = page.getByTestId('profile-delete-confirm-input');
  const confirmButton = page.getByTestId('profile-delete-confirm');
  await expect(confirmInput).toHaveAttribute('placeholder', t.delete_confirmation_word);
  await expect(confirmButton).toBeDisabled();
  await confirmInput.fill(`${t.delete_confirmation_word}x`);
  await expect(confirmButton).toBeDisabled();
  await confirmInput.fill(t.delete_confirmation_word);
  await expect(confirmButton).toBeEnabled();
  expect(deleteRequests).toBe(0);

  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(lang === 'es' ? 'es-MX' : lang);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  if (lang !== 'es') {
    expect(await confirmInput.getAttribute('placeholder')).not.toBe('ELIMINAR');
  }
}

for (const lang of LANGUAGES) {
  test(`profile edit localization renders ${lang} on desktop`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await verifyProfileEdit(page, lang, { width: 1440, height: 900 });
  });
}

for (const lang of LANGUAGES) {
  test(`profile edit localization renders ${lang} on mobile`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await verifyProfileEdit(page, lang, { width: 390, height: 844 });
  });
}
