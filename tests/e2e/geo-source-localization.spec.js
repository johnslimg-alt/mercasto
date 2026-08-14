import { test, expect } from '@playwright/test';
import { SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';
import { getGeoSourcePage, getGeoSourceShellCopy } from '../../src/content/geoSourcePages.js';

async function setLanguage(page, lang) {
  await page.addInitScript(savedLang => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
  }, lang);
}

async function mockApi(page) {
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/categories') || path.endsWith('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    if (path.endsWith('/banners')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ banners: [] }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function expectDocumentLanguage(page, lang) {
  await expect.poll(() => page.locator('html').getAttribute('lang')).toBe(lang === 'es' ? 'es-MX' : lang);
}

async function expectNoOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

for (const lang of SUPPORTED_LANGUAGES) {
  test(`GEO source page follows active language in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const source = getGeoSourcePage('como-funciona', lang);
    const shell = getGeoSourceShellCopy(lang);
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/como-funciona', { waitUntil: 'domcontentloaded' });

    await expectDocumentLanguage(page, lang);
    await expect(page.getByRole('heading', { level: 1, name: source.heading, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: shell.faqTitle, exact: true })).toBeVisible();
    await expect.poll(() => page.title()).toBe(source.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', source.description);

    const schema = await page.locator('#geo-source-schema').textContent();
    const graph = JSON.parse(schema)['@graph'];
    const expectedLanguage = lang === 'es' ? 'es-MX' : lang;
    expect(graph[0].inLanguage).toBe(expectedLanguage);
    expect(graph.find(item => item['@type'] === 'WebSite').inLanguage).toBe(expectedLanguage);
    expect(graph.find(item => item['@type'] === 'BreadcrumbList').itemListElement[0].name).toBe(shell.home);
    await expectNoOverflow(page);
  });
}

for (const lang of ['es', 'zh', 'ar', 'ru']) {
  test(`GEO source page ${lang} fits mobile and RTL`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile');
    const source = getGeoSourcePage('tarifas', lang);
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/tarifas', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);
    await expect(page.getByRole('heading', { level: 1, name: source.heading, exact: true })).toBeVisible();
    await expect.poll(() => page.locator('html').getAttribute('dir')).toBe(lang === 'ar' ? 'rtl' : 'ltr');
    await expectNoOverflow(page);
  });
}
