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

test.describe('public launch smoke', () => {
  for (const route of publicRoutes) {
    test(`${route} renders without server error`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${route} HTTP status`).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/Whoops|Stack trace|SQLSTATE|APP_KEY|DB_PASSWORD|Exception/i);
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
