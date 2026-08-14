import { test, expect } from '@playwright/test';
import { SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';
import { getVerticalCopy } from '../../src/utils/verticalCopy.js';
import { getServiciosLandingCopy } from '../../src/utils/serviciosLandingCopy.js';

const runtimeTranslations = {};
for (const lang of SUPPORTED_LANGUAGES) {
  runtimeTranslations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

async function mockServicesApi(page) {
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
  test(`servicios landing renders complete ${lang} copy and keeps canonical category search`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await setLanguage(page, lang);
    await mockServicesApi(page);
    await page.goto('/servicios', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);

    const hero = getVerticalCopy(lang, 'servicios');
    const copy = getServiciosLandingCopy(lang);
    const runtime = runtimeTranslations[lang];
    await expect(page.getByRole('heading', { level: 1, name: hero.title })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.categories[0], exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: copy.categories.at(-1), exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: copy.mapTitle })).toBeVisible();
    await expect(page.getByText(copy.mapDescription, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: copy.needsTitle })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: copy.trustTitle })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: copy.trust[0][0] })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: copy.ctaTitle })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.ctaButton })).toBeVisible();

    const heroForm = page.locator('form').filter({ has: page.locator(`input[placeholder="${hero.placeholder}"]`) }).first();
    await expect(heroForm.getByRole('button', { name: runtime.search_btn })).toBeVisible();
    await expect(heroForm.locator('select').first().locator('option[value=""]')).toHaveText(runtime.all_mexico);
    await expectNoOverflow(page);

    await page.getByRole('button', { name: copy.categories[0], exact: true }).last().click();
    await expect.poll(() => new URL(page.url()).searchParams.get('category')).toBe('servicios');
    await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe('plomería electricidad carpintería');
  });
}

for (const lang of ['es', 'zh', 'ar', 'ru']) {
  test(`servicios ${lang} copy fits mobile`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile');
    await setLanguage(page, lang);
    await mockServicesApi(page);
    await page.goto('/servicios', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);
    const hero = getVerticalCopy(lang, 'servicios');
    const copy = getServiciosLandingCopy(lang);
    await expect(page.getByRole('heading', { level: 1, name: hero.title })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.categories[0], exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: copy.ctaTitle })).toBeVisible();
    await expectNoOverflow(page);
  });
}
