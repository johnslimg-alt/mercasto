import { expect, test } from '@playwright/test';

const publicRoutes = [
  '/',
  '/listings',
  '/publish',
  '/login',
  '/register',
  '/account',
  '/account/listings',
  '/account/billing',
  '/account/promotions',
];

const legalRoutes = [
  { path: '/terminos', marker: /Términos|Terminos|Uso/i },
  { path: '/privacidad', marker: /Privacidad|datos personales/i },
  { path: '/cookies', marker: /Cookies/i },
  { path: '/contacto', marker: /Contacto|soporte@mercasto\.com/i },
  { path: '/ayuda', marker: /Ayuda|Centro/i },
  { path: '/safety', marker: /Seguridad|Safety|fraude/i },
  { path: '/reembolsos', marker: /Política de pagos y reembolsos/i },
  { path: '/moderacion', marker: /Política de moderación/i },
];

test.describe('public launch smoke', () => {
  for (const route of publicRoutes) {
    test(`${route} renders without server error`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${route} HTTP status`).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/Whoops|Stack trace|SQLSTATE|APP_KEY|DB_PASSWORD|Exception/i);
    });
  }

  for (const route of legalRoutes) {
    test(`${route.path} renders expected legal/business content`, async ({ page }) => {
      const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${route.path} HTTP status`).toBeLessThan(400);
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('body')).toContainText(route.marker);
      await expect(page.locator('body')).not.toContainText(/Whoops|Stack trace|SQLSTATE|APP_KEY|DB_PASSWORD|Exception|No pudimos cargar esta página/i);
    });
  }

  test('health and core APIs respond', async ({ request }) => {
    await expect(await request.get('/up')).toBeOK();
    await expect(await request.get('/api/categories')).toBeOK();
    await expect(await request.get('/api/ads?page=1')).toBeOK();
  });

  test('sensitive files are denied', async ({ request }) => {
    const paths = ['/.env', '/.git/config', '/backend/.env', '/composer.json', '/package.json'];
    for (const path of paths) {
      const response = await request.get(path);
      expect(response.status(), `${path} should be hidden`).toBe(404);
    }
  });

  test('SEO manifests are reachable', async ({ request }) => {
    await expect(await request.get('/robots.txt')).toBeOK();
    await expect(await request.get('/sitemap.xml')).toBeOK();
  });
});
