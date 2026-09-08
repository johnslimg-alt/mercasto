import { test, expect } from '@playwright/test';
import { SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';
import { subcategoriesMap } from '../../src/constants/locationsAndCategories.js';
import { categoryLandingTranslations } from '../../src/constants/categoryLandingTranslations.js';
import { getCategoryLandingSubsections } from '../../src/utils/categoryLandingSubsections.js';

const categories = ['electronica', 'moda', 'hogar', 'mascotas', 'infantil', 'negocios', 'ocio', 'boletos'];

async function mockApi(page) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/ads')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    if (url.pathname.endsWith('/categories') || url.pathname.endsWith('/category-attributes')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (url.pathname.endsWith('/auth/providers')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    if (url.pathname.endsWith('/banners')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ banners: [] }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function setLanguage(page, lang) {
  await page.addInitScript(savedLang => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
  }, lang);
}

async function expectDocumentLanguage(page, lang) {
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(lang === 'es' ? 'es-MX' : lang);
  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(lang === 'ar' ? 'rtl' : 'ltr');
}

async function expectNoOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

for (const lang of SUPPORTED_LANGUAGES) {
  test(`electronica subcategory labels render in ${lang} while search stays canonical`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/electronica', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);

    const canonical = subcategoriesMap.electronica;
    const items = getCategoryLandingSubsections(lang, 'electronica', canonical);
    await expect(page.getByRole('heading', { level: 1, name: categoryLandingTranslations[lang].electronica.title })).toBeVisible();
    await expect(page.getByRole('button', { name: items[0].name, exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: items.at(-1).name, exact: true }).first()).toBeVisible();
    await expectNoOverflow(page);

    await page.getByRole('button', { name: items[0].name, exact: true }).last().click();
    await expect.poll(() => new URL(page.url()).searchParams.get('category')).toBe('electronica');
    await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe(canonical[0]);
  });
}

for (const category of categories) {
  test(`${category} uses translated English tiles with canonical search values`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await setLanguage(page, 'en');
    await mockApi(page);
    await page.goto(`/${category}`, { waitUntil: 'domcontentloaded' });
    const canonical = subcategoriesMap[category];
    const items = getCategoryLandingSubsections('en', category, canonical);
    await expect(page.getByRole('button', { name: items[0].name, exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: items.at(-1).name, exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: items.at(-1).name, exact: true }).last().click();
    await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe(canonical.at(-1));
  });
}

for (const lang of ['es', 'zh', 'ar', 'ru']) {
  test(`electronica ${lang} localized tiles fit mobile`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile');
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/electronica', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);
    const items = getCategoryLandingSubsections(lang, 'electronica', subcategoriesMap.electronica);
    await expect(page.getByRole('button', { name: items[0].name, exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: items.at(-1).name, exact: true }).first()).toBeVisible();
    await expectNoOverflow(page);
  });
}


test('category landing trust section remains dark and readable in dark mode', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('theme', 'dark');
  });
  await mockApi(page);
  await page.goto('/negocios', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  await expect(page.getByTestId('category-trust-section')).toBeVisible();
  await expect(page.getByTestId('category-trust-card').first()).toBeVisible();

  const colors = await page.evaluate(() => {
    const renderedRgb = value => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const section = document.querySelector('[data-testid="category-trust-section"]');
    const card = document.querySelector('[data-testid="category-trust-card"]');
    const title = document.querySelector('[data-testid="category-trust-title"]');
    return {
      section: renderedRgb(getComputedStyle(section).backgroundColor),
      card: renderedRgb(getComputedStyle(card).backgroundColor),
      title: renderedRgb(getComputedStyle(title).color),
    };
  });
  expect(Math.max(...colors.section)).toBeLessThan(90);
  expect(Math.max(...colors.card)).toBeLessThan(110);
  expect(Math.min(...colors.title)).toBeGreaterThan(190);
  await expectNoOverflow(page);
});
