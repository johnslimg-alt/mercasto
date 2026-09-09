import { expect, test } from '@playwright/test';

const locales = [
  ['es', 'La plataforma de clasificados más moderna e inteligente con AI', 'Clasificados con IA'],
  ['en', 'The most modern and intelligent AI-powered classifieds platform', 'AI-powered classifieds'],
  ['ru', 'Самая современная и умная доска объявлений с AI', 'Объявления с AI'],
];

for (const [language, tagline, shortTagline] of locales) {
  test.describe(`${language} AI brand positioning`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((lang) => {
        localStorage.setItem('lang', lang);
        localStorage.setItem('mercasto_language', lang);
        localStorage.setItem('i18nextLng', lang);
        localStorage.setItem('cookie_consent', 'essential');
        localStorage.removeItem('auth_token');
      }, language);
    });

    test('uses the compact AI brand surface and preserves metadata', async ({ page }, testInfo) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const logo = page.locator('.header-logo-link');
      await expect(logo).toBeVisible();
      const mobile = testInfo.project.name.includes('mobile');
      const visibleBrand = logo.getByTestId(mobile ? 'mercasto-ai-short-mobile' : 'mercasto-ai-short-desktop');
      await expect(visibleBrand).toBeVisible();
      await expect(visibleBrand).toHaveText(mobile ? 'AI' : shortTagline);
      await expect(page.getByTestId('global-ai-brand-strip')).toHaveCount(0);
      await expect(page).toHaveTitle(new RegExp(tagline));
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description).toBeTruthy();
      expect(description).toMatch(/AI|IA|KI|人工知能|인공지능|الذكاء الاصطناعي|בינה מלאכותית/i);

      await expect.poll(async () => page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })), { timeout: 5000 }).toMatchObject({
        clientWidth: page.viewportSize()?.width,
        scrollWidth: page.viewportSize()?.width,
      });
    });

    test('is repeated on the authentication entry screen', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      const authModal = page.locator('.fixed.inset-0').filter({ has: page.locator('input[name="email"]') }).first();
      await expect(authModal.getByTestId('auth-modal-ai-brand-message')).toContainText(tagline);
      await expect(page.locator('body')).not.toContainText(/Error 404|No encontrado/i);
    });
  });
}
