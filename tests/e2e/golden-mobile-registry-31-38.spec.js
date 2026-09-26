import { test, expect } from '@playwright/test';
import { getGeoSourcePage } from '../../src/content/geoSourcePages.js';

async function installSession(page, theme = 'light') {
  await page.addInitScript(({ theme }) => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('theme', theme);
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }, { theme });
}

async function mockApi(page) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/categories') || url.pathname.endsWith('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.endsWith('/ads')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }),
      });
    }
    if (url.pathname.endsWith('/banners')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"banners":[]}' });
    }
    if (url.pathname.endsWith('/auth/providers')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ google: false, apple: false, sms: false }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

const registry = [
  { number: 31, name: 'Centro de ayuda', path: '/ayuda', main: 'golden-help-main' },
  {
    number: 32,
    name: 'Artículo de ayuda',
    path: '/ayuda/publicar-anuncio',
    main: 'golden-geo-source-main',
    heading: getGeoSourcePage('ayuda/publicar-anuncio', 'es').heading,
  },
  {
    number: 33,
    name: 'Seguridad / Report',
    path: '/seguridad',
    main: 'golden-geo-source-main',
    heading: getGeoSourcePage('seguridad', 'es').heading,
  },
  { number: 34, name: 'Blog / Noticias', path: '/blog', main: 'golden-blog-main' },
  {
    number: 35,
    name: 'Artículo de blog',
    path: '/blog/comprar-con-seguridad',
    main: 'golden-blog-article-main',
  },
  {
    number: 36,
    name: 'Sobre Mercasto',
    path: '/sobre-mercasto',
    main: 'golden-geo-source-main',
    heading: getGeoSourcePage('sobre-mercasto', 'es').heading,
  },
  { number: 37, name: 'Contactar soporte', path: '/contacto', main: 'golden-contact-main' },
  { number: 38, name: 'Estados del sistema', path: '/qa-mobile-system-state-404', main: 'golden-not-found-main' },
];

for (const item of registry) {
  test(`mobile registry ${item.number}/38 — ${item.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile');
    await installSession(page);
    await mockApi(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(item.path, { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('golden-header')).toBeVisible();
    const main = page.getByTestId(item.main);
    await expect(main).toBeVisible();
    await expect(page.locator('.site-header')).toBeHidden();

    if (item.heading) {
      await expect(page.getByRole('heading', { level: 1, name: item.heading, exact: true })).toBeVisible();
    }

    const bottom = page.getByTestId('golden-bottom-nav');
    await expect(bottom).toBeVisible();
    await expect(bottom.locator(':scope > a, :scope > button')).toHaveCount(5);
    await expect(page.getByTestId('golden-mobile-search-input')).toBeVisible();

    const touchTargets = await bottom.locator(':scope > a, :scope > button').evaluateAll(nodes =>
      nodes.map(node => node.getBoundingClientRect().height),
    );
    expect(touchTargets.every(height => height >= 48)).toBe(true);

    const geometry = await main.boundingBox();
    expect(geometry?.x).toBeGreaterThanOrEqual(0);
    expect(geometry?.width).toBeLessThanOrEqual(390);

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    const scrollbar = await page.evaluate(() => ({
      html: getComputedStyle(document.documentElement).scrollbarWidth,
      body: getComputedStyle(document.body).scrollbarWidth,
    }));
    expect(scrollbar).toEqual({ html: 'none', body: 'none' });
  });
}

test('mobile registry 31–38 keeps the same geometry in day and night modes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await installSession(page, 'light');
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/sobre-mercasto', { waitUntil: 'domcontentloaded' });

  const main = page.getByTestId('golden-geo-source-main');
  const before = await main.boundingBox();
  await page.getByTestId('golden-theme-toggle').click();
  await expect(page.getByTestId('golden-theme-toggle')).toHaveAttribute('aria-pressed', 'true');
  const after = await main.boundingBox();

  expect(Math.abs((after?.x ?? 0) - (before?.x ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((after?.width ?? 0) - (before?.width ?? 0))).toBeLessThanOrEqual(1);
});
