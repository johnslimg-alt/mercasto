import { test, expect } from '@playwright/test';
import { SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';
import { getVerticalCopy } from '../../src/utils/verticalCopy.js';
import { getAutosLandingCopy } from '../../src/utils/autosLandingCopy.js';

const runtimeTranslations = {};
for (const lang of SUPPORTED_LANGUAGES) {
  runtimeTranslations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

async function mockAutosApi(page) {
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    if (url.pathname.endsWith('/categories') || url.pathname.endsWith('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    if (url.pathname.endsWith('/banners')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ banners: [] }) });
    }
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
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

for (const lang of SUPPORTED_LANGUAGES) {
  test(`autos landing renders complete ${lang} copy and keeps canonical filters`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await setLanguage(page, lang);
    await mockAutosApi(page);
    await page.goto('/autos', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);

    const hero = getVerticalCopy(lang, 'motor');
    const copy = getAutosLandingCopy(lang);
    const runtime = runtimeTranslations[lang];
    await expect(page.getByRole('heading', { level: 1, name: hero.title })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.subsections[0], exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.subsections.at(-1), exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.conditions.nuevo, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.conditions.usado, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: copy.mapTitle })).toBeVisible();
    await expect(page.getByText(copy.mapDescription, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: copy.brandsTitle })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: copy.sellTitle })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.sellButton })).toBeVisible();
    await expect(page.getByText(copy.stats[0][1], { exact: true })).toBeVisible();

    const heroForm = page.locator('form').filter({ has: page.locator(`input[placeholder="${hero.placeholder}"]`) }).first();
    await expect(heroForm.getByRole('button', { name: runtime.search_btn })).toBeVisible();
    await expect(heroForm.locator('select').first().locator('option[value=""]')).toHaveText(runtime.all_mexico);
    await expectNoOverflow(page);

    await page.getByRole('button', { name: copy.conditions.nuevo, exact: true }).click();
    await page.getByRole('button', { name: copy.applyFilters }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('category')).toBe('motor');
    await expect.poll(() => new URL(page.url()).searchParams.get('condition')).toBe('nuevo');
  });
}

for (const lang of ['es', 'zh', 'ar', 'ru']) {
  test(`autos ${lang} copy fits mobile`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile');
    await setLanguage(page, lang);
    await mockAutosApi(page);
    await page.goto('/autos', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);

    const hero = getVerticalCopy(lang, 'motor');
    const copy = getAutosLandingCopy(lang);
    await expect(page.getByRole('heading', { level: 1, name: hero.title })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.subsections[0], exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.conditions.nuevo, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: copy.sellTitle })).toBeVisible();
    await expectNoOverflow(page);
  });
}
