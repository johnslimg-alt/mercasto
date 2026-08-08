import { expect, test } from '@playwright/test';

const LANGUAGES = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'he', 'yi', 'ru', 'ja'];
const RTL_LANGUAGES = new Set(['ar', 'he', 'yi']);
const translations = {};
for (const lang of LANGUAGES) {
  translations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

const notification = {
  id: 31,
  type: 'price_drop',
  is_read: 0,
  created_at: '2026-08-08T08:15:00Z',
  data: { ad_title: 'Toyota Corolla', old_price: 325000, new_price: 299500 },
};

const spanishLeakage = [
  'Cuenta no verificada. Confirma tu email o teléfono para aumentar la confianza en Mercasto.',
  'Reenviar email',
  'Directorio de Tiendas',
  'Hecho en México',
  '¿No tienes cuenta? Únete',
  '¿Olvidaste tu contraseña?',
];
async function mockShellApi(page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    let body = '{}';
    if (url.pathname.endsWith('/user')) {
      const authorization = route.request().headers().authorization || '';
      if (!authorization.startsWith('Bearer ')) {
        return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthenticated.' }) });
      }
      body = JSON.stringify({ id: 91, name: 'QA User', email: 'qa@example.test', role: 'individual', is_verified: true, account_verified: false });
    } else if (url.pathname.endsWith('/notifications')) {
      body = JSON.stringify({ data: [notification], next_page_url: null });
    } else if (url.pathname.endsWith('/auth/providers')) {
      body = JSON.stringify({ google: false, apple: false, sms: false, twitter: false, telegram: false });
    } else if (url.pathname.endsWith('/categories')) {
      body = '[]';
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body });
  });
}

async function installAuthenticatedShell(page, lang) {
  await page.addInitScript(({ savedLang }) => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('auth_token', 'shell-localization-token');
    localStorage.setItem('user', JSON.stringify({ id: 91, name: 'QA User', email: 'qa@example.test', role: 'individual', is_verified: true, account_verified: false }));
    localStorage.setItem('cookiesAccepted', 'true');
  }, { savedLang: lang });
}
async function assertShell(page, lang, viewport) {
  const t = translations[lang];
  await page.setViewportSize(viewport);
  await mockShellApi(page);
  await installAuthenticatedShell(page, lang);
  await page.goto('/notificaciones');

  await expect(page.getByText(t.verification_unverified_desc, { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: t.verification_resend_email })).toBeVisible();
  await expect(page.getByText(t.footer_store_directory, { exact: true })).toBeVisible();
  await expect(page.getByText(t.footer_made_in_mexico, { exact: false })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(lang === 'es' ? 'es-MX' : lang);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  if (lang !== 'es') {
    const body = await page.locator('body').innerText();
    for (const literal of spanishLeakage) expect(body).not.toContain(literal);
  }
}
async function assertDashboardStatuses(page, lang) {
  const t = translations[lang];
  await page.goto('/profile');
  await expect(page.getByTestId('dashboard-tab-my_ads')).toBeVisible();
  await expect(page.getByRole('button', { name: new RegExp(t.review_ready_status) })).toBeVisible();
  await expect(page.getByRole('button', { name: new RegExp(t.needs_correction_status) })).toBeVisible();
  if (lang !== 'es') {
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('Listo para reactivar');
    expect(body).not.toContain('Requiere corrección');
  }
}

async function assertHeaderControls(page, lang, mobile) {
  const t = translations[lang];
  const themeButton = mobile
    ? page.locator('button.mobile-theme-icon')
    : page.locator('button.desktop-header-control[aria-pressed][aria-label]').first();
  if (mobile) {
    await expect(themeButton).toBeVisible();
    expect([t.light_mode, t.dark_mode]).toContain(await themeButton.getAttribute('aria-label'));
    await expect(page.getByRole('button', { name: t.open_account_menu })).toBeVisible();
  }
  await expect(page.getByRole('combobox', { name: t.language }).first()).toBeVisible();

  if (!mobile) {
    const bell = page.getByRole('button', { name: t.notifications }).filter({ visible: true }).first();
    await expect(bell).toBeVisible();
    await bell.click();
    await expect(page.getByText(`${t.notifications_price_drop_prefix} Toyota Corolla`, { exact: true })).toBeVisible();
    await expect(page.getByText(t.notifications_view_all, { exact: true })).toBeVisible();
  }
}

async function assertAuthShell(page, lang) {
  const t = translations[lang];
  const context = page.context();
  await page.evaluate((savedLang) => {
    localStorage.clear();
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
  }, lang);
  await page.close();

  const authPage = await context.newPage();
  await mockShellApi(authPage);
  await authPage.goto('/login');
  await expect(authPage.getByText(`${t.login} · Mercasto`, { exact: true })).toBeVisible();
  await expect(authPage.getByText(t.auth_login_desc, { exact: true })).toBeVisible();
  await expect(authPage.getByRole('button', { name: t.auth_no_account_join })).toBeVisible();
  await expect(authPage.getByRole('button', { name: t.forgot_password })).toBeVisible();
  await authPage.close();
}

for (const lang of LANGUAGES) {
  test(`global shell renders ${lang} on desktop`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await assertShell(page, lang, { width: 1440, height: 900 });
    await assertHeaderControls(page, lang, false);
    await assertDashboardStatuses(page, lang);
    await assertAuthShell(page, lang);
  });
}

for (const lang of LANGUAGES) {
  test(`global shell renders ${lang} on mobile`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await assertShell(page, lang, { width: 390, height: 844 });
    await assertHeaderControls(page, lang, true);
    await assertDashboardStatuses(page, lang);
    await assertAuthShell(page, lang);
  });
}
