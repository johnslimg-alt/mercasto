import { expect, test } from '@playwright/test';

const locales = [
  ['es', 'La plataforma de clasificados más moderna con IA'],
  ['en', 'The most modern AI-powered classifieds platform'],
  ['ru', 'Самая современная доска объявлений с AI'],
];

for (const [language, tagline] of locales) {
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

    test('is visible globally and present in metadata', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      const strip = page.getByTestId('global-ai-brand-strip');
      await expect(strip).toBeVisible();
      await expect(strip).toContainText(tagline);
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
