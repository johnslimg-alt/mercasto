import { test, expect } from '@playwright/test';

async function installSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookiesAccepted', 'true');
  });
}

async function mockApi(page) {
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/email/verify')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    }
    if (path.endsWith('/user/notifications/list')) {
      const body = JSON.stringify([
        { id: 1, title: 'A', message: 'A', is_read: 0, created_at: '2026-09-20T12:00:00Z' },
        { id: 2, title: 'B', message: 'B', is_read: 0, created_at: '2026-09-20T12:01:00Z' },
      ]);
      return route.fulfill({ status: 200, contentType: 'application/json', body });
    }
    if (path.endsWith('/notifications/unread-count')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"count":2}' });
    }
    if (path.endsWith('/user')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"id":7,"name":"E2E User","account_verified":true}' });
    }
    if (path.endsWith('/categories') || path.endsWith('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/ads')) {
      const body = JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 });
      return route.fulfill({ status: 200, contentType: 'application/json', body });
    }
    if (path.endsWith('/banners')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"banners":[]}' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

const routes = [
  ['/ayuda', 'golden-help-main'],
  ['/contacto', 'golden-contact-main'],
  ['/verificar-email?token=test-token&email=user%40example.com', 'golden-email-verification-main'],
  ['/como-funciona', 'golden-geo-source-main'],
  ['/safety', 'golden-geo-source-main'],
  ['/terminos', 'golden-terms-main'],
  ['/privacidad', 'golden-privacy-main'],
  ['/cookies', 'golden-cookies-main'],
  ['/moderacion', 'golden-moderation-main'],
  ['/reembolsos', 'golden-refunds-main'],
  ['/motor', 'golden-autos-main'],
  ['/inmuebles', 'golden-inmuebles-main'],
  ['/empleos', 'golden-empleos-main'],
  ['/servicios', 'golden-servicios-main'],
  ['/productos', 'golden-productos-main'],
  ['/turismo', 'golden-turismo-main'],
  ['/electronica', 'golden-category-main'],
  ['/ruta-inexistente-golden', 'golden-not-found-main'],
];

test('public utility, legal and vertical routes share Golden chrome on desktop and mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  test.setTimeout(90_000);
  await installSession(page);
  await mockApi(page);

  for (const viewport of [
    { width: 1440, height: 900, mobile: false },
    { width: 390, height: 844, mobile: true },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const [path, mainTestId] of routes) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('golden-header')).toBeVisible();
      await expect(page.getByTestId(mainTestId)).toBeVisible();
      await expect(page.locator('.site-header')).toBeHidden();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);

      if (viewport.mobile) {
        await expect(page.getByTestId('golden-bottom-nav')).toBeVisible();
        await expect(page.locator('.mobile-tabbar')).toBeHidden();
      }
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/ayuda', { waitUntil: 'domcontentloaded' });
  const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await page.getByTestId('golden-theme-toggle').click();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(!before);
});


test('guest auth stays on the utility route and search remains available', async ({ page }) => {
  await installSession(page);
  await mockApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/ayuda', { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('golden-desktop-search-input')).toBeVisible();
  await page.getByTestId('golden-account-button').click();
  await expect(page.locator('[role="dialog"][aria-modal="true"]')).toBeVisible();
  await expect(page).toHaveURL(/\/ayuda$/);
  await page.getByTestId('auth-modal-close').click();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('golden-mobile-search-input')).toBeVisible();
  await page.getByTestId('golden-mobile-notifications-tab').click();
  await expect(page.locator('[role="dialog"][aria-modal="true"]')).toBeVisible();
  await expect(page).toHaveURL(/\/ayuda$/);
});


test('active marketplace location survives navigation into a utility route', async ({ page }) => {
  await installSession(page);
  await mockApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/listings?state=Veracruz&location=Veracruz', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('golden-header')).toBeVisible();
  await expect(page.getByTestId('golden-location-button')).toContainText('Veracruz');

  await page.getByTestId('golden-header').getByRole('link', { name: /ayuda|help/i }).click();
  await expect(page).toHaveURL(/\/ayuda$/);
  await expect(page.getByTestId('golden-location-button')).toContainText('Veracruz');
});


test('authenticated utility shell preserves live unread notification state', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('auth_token', 'e2e-token');
    localStorage.setItem('user', JSON.stringify({ id: 7, name: 'E2E User', account_verified: true }));
  });
  await mockApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/ayuda', { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('golden-notifications-unread')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('golden-mobile-notifications-unread')).toBeVisible();
});


test('legal policy routes keep authoritative SEO and reset scroll on client navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await installSession(page);
  await mockApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto('/seguridad', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('golden-geo-source-main')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.locator('a[href="/moderacion"]').first().click();
  await expect(page).toHaveURL(/\/moderacion$/);
  await expect(page.getByTestId('golden-moderation-main')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
  await expect(page).toHaveTitle('Política de moderación | Mercasto');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Conoce las reglas de moderación, contenido prohibido, reportes y apelaciones de Mercasto México.',
  );

  await page.goto('/tarifas', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('golden-geo-source-main')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.locator('a[href="/reembolsos"]').first().click();
  await expect(page).toHaveURL(/\/reembolsos$/);
  await expect(page.getByTestId('golden-refunds-main')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
  await expect(page).toHaveTitle('Política de pagos y reembolsos | Mercasto');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Consulta cómo funcionan los servicios de pago, promociones y revisiones de reembolso en Mercasto México.',
  );
});

test('Golden legal sticky controls use Golden offsets and accessible dark contrast', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await installSession(page);
  await mockApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const [path, mainTestId] of [
    ['/terminos', 'golden-terms-main'],
    ['/privacidad', 'golden-privacy-main'],
    ['/cookies', 'golden-cookies-main'],
  ]) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId(mainTestId)).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 600));
    const breadcrumb = page.getByTestId('legal-breadcrumb');
    const sectionNav = page.getByTestId('legal-section-nav');
    await expect(breadcrumb).toBeVisible();
    await expect(sectionNav).toBeVisible();
    const breadcrumbBox = await breadcrumb.boundingBox();
    const navBox = await sectionNav.boundingBox();
    expect(breadcrumbBox?.y).toBeLessThanOrEqual(1);
    expect(navBox?.y).toBeGreaterThanOrEqual(76);
    expect(navBox?.y).toBeLessThanOrEqual(84);
  }

  await page.goto('/terminos', { waitUntil: 'domcontentloaded' });
  const dark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  if (!dark) await page.getByTestId('golden-theme-toggle').click();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  const badgeColors = await page.locator('.bg-lime-100.text-lime-700').first().evaluate((node) => {
    const style = getComputedStyle(node);
    return { color: style.color, backgroundColor: style.backgroundColor };
  });
  expect(badgeColors).toEqual({
    color: 'rgb(190, 242, 100)',
    backgroundColor: 'rgb(54, 83, 20)',
  });

  await page.goto('/reembolsos', { waitUntil: 'domcontentloaded' });
  const updated = page.getByText(/Última actualización: 23 de mayo de 2026/);
  await expect(updated).toBeVisible();
  await expect(updated).toHaveClass(/text-slate-300/);
  await expect(page.getByText(/no se renuevan automáticamente/).first()).toBeVisible();
  await expect(page.getByText(/se requiere una nueva compra para activar otro periodo/).first()).toBeVisible();
  await expect(page.getByText(/La cancelación evita renovaciones posteriores/)).toHaveCount(0);
});
