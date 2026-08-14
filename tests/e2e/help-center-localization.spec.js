import { test, expect } from '@playwright/test';
import { SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';
import { getHelpCenterCopy } from '../../src/utils/helpCenterCopy.js';

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
  const expected = lang === 'es' ? 'es-MX' : lang;
  await expect.poll(() => page.locator('html').getAttribute('lang')).toBe(expected);
}

async function expectNoOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

for (const lang of SUPPORTED_LANGUAGES) {
  test(`help center renders and searches localized FAQ in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const copy = getHelpCenterCopy(lang);
    const firstSection = copy.sections[0];
    const firstFaq = firstSection.faqs[0];
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/ayuda', { waitUntil: 'domcontentloaded' });

    await expectDocumentLanguage(page, lang);
    await expect(page.getByRole('heading', { level: 1, name: copy.heroTitle, exact: true })).toBeVisible();
    await expect(page.getByText(firstSection.title, { exact: true })).toBeVisible();
    await expect.poll(() => page.title()).toBe(copy.seoTitle);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', copy.seoDescription);

    const search = page.getByPlaceholder(copy.searchPlaceholder, { exact: true });
    await search.fill(firstFaq.q);
    await expect(page.getByRole('button', { name: firstFaq.q, exact: true })).toBeVisible();
    await page.getByRole('button', { name: firstFaq.q, exact: true }).click();
    await expect(page.getByText(firstFaq.a, { exact: true })).toBeVisible();
    await expectNoOverflow(page);
  });
}

for (const lang of ['es', 'zh', 'ar', 'ru']) {
  test(`help center ${lang} fits mobile and RTL`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile');
    const copy = getHelpCenterCopy(lang);
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/ayuda', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);
    await expect(page.getByRole('heading', { level: 1, name: copy.heroTitle, exact: true })).toBeVisible();
    await expect.poll(() => page.locator('html').getAttribute('dir')).toBe(lang === 'ar' ? 'rtl' : 'ltr');
    await expectNoOverflow(page);
  });
}
