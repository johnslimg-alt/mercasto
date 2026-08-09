import { test, expect } from '@playwright/test';
import { SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';
import { getVerticalCopy, getVerticalLandingCopy } from '../../src/utils/verticalCopy.js';

const runtimeTranslations = {};
for (const lang of SUPPORTED_LANGUAGES) {
  runtimeTranslations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

async function mockVerticalApi(page) {
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
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(lang);
  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(lang === 'ar' ? 'rtl' : 'ltr');
}

async function expectNoOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

for (const lang of SUPPORTED_LANGUAGES) {
  test(`products landing renders complete ${lang} copy`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await setLanguage(page, lang);
    await mockVerticalApi(page);
    await page.goto('/productos', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);

    const copy = getVerticalCopy(lang, 'productos');
    const landing = getVerticalLandingCopy(lang, 'productos');
    const runtime = runtimeTranslations[lang];
    await expect(page.getByRole('heading', { level: 1, name: copy.title })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: landing.exploreTitle })).toBeVisible();
    await expect(page.getByRole('button', { name: landing.sectionLabels[0] })).toBeVisible();
    await expect(page.getByRole('button', { name: landing.sectionLabels.at(-1) })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: landing.guideTitle })).toBeVisible();

    const heroForm = page.locator('form').filter({ has: page.locator(`input[placeholder="${copy.placeholder}"]`) }).first();
    await expect(heroForm.getByRole('button', { name: runtime.search_btn })).toBeVisible();
    await expect(heroForm.locator('select').first().locator('option[value=""]')).toHaveText(runtime.all_mexico);
    await expectNoOverflow(page);
  });

  test(`tourism landing renders complete ${lang} copy`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await setLanguage(page, lang);
    await mockVerticalApi(page);
    await page.goto('/turismo', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);

    const copy = getVerticalCopy(lang, 'turismo');
    const landing = getVerticalLandingCopy(lang, 'turismo');
    const runtime = runtimeTranslations[lang];
    await expect(page.getByRole('heading', { level: 1, name: copy.title })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: landing.exploreTitle })).toBeVisible();
    await expect(page.getByRole('button', { name: landing.sectionLabels.hospedaje })).toBeVisible();
    await expect(page.getByRole('button', { name: landing.transportRental })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: copy.featured })).toBeVisible();
    await expect(page.getByRole('button', { name: landing.viewAll })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: landing.mapTitle })).toBeVisible();
    await expect(page.getByText(landing.mapDescription, { exact: true })).toBeVisible();

    const heroForm = page.locator('form').filter({ has: page.locator(`input[placeholder="${copy.placeholder}"]`) }).first();
    await expect(heroForm.getByRole('button', { name: runtime.search_btn })).toBeVisible();
    await expect(heroForm.locator('select').first().locator('option[value=""]')).toHaveText(runtime.all_mexico);
    await expectNoOverflow(page);
  });
}

for (const lang of ['es', 'zh', 'ar', 'ru']) {
  for (const route of ['productos', 'turismo']) {
    test(`${route} ${lang} copy fits mobile`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-mobile');
      await setLanguage(page, lang);
      await mockVerticalApi(page);
      await page.goto(`/${route}`, { waitUntil: 'domcontentloaded' });
      await expectDocumentLanguage(page, lang);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expectNoOverflow(page);
    });
  }
}
