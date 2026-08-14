import { test, expect } from '@playwright/test';
import { SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';
import { getVerticalCopy } from '../../src/utils/verticalCopy.js';
import { getEmpleosLandingCopy } from '../../src/utils/empleosLandingCopy.js';

const runtimeTranslations = {};
for (const lang of SUPPORTED_LANGUAGES) {
  runtimeTranslations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

async function mockJobsApi(page) {
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
  test(`empleos landing renders complete ${lang} copy and keeps canonical search values`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await setLanguage(page, lang);
    await mockJobsApi(page);
    await page.goto('/empleos', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);

    const hero = getVerticalCopy(lang, 'empleos');
    const copy = getEmpleosLandingCopy(lang);
    const runtime = runtimeTranslations[lang];
    await expect(page.getByRole('heading', { level: 1, name: hero.title })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.subsections[0], exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.subsections.at(-1), exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: copy.mapTitle })).toBeVisible();
    await expect(page.getByText(copy.mapDescription, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: copy.areasTitle })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: copy.employerTitle })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.employerButton })).toBeVisible();
    await expect(page.getByText(copy.stats[0][1], { exact: true })).toBeVisible();

    const heroForm = page.locator('form').filter({ has: page.locator(`input[placeholder="${hero.placeholder}"]`) }).first();
    await expect(heroForm.getByRole('button', { name: runtime.search_btn })).toBeVisible();
    await expect(heroForm.locator('select').first().locator('option[value=""]')).toHaveText(runtime.all_mexico);
    await expectNoOverflow(page);

    const quickFilters = page.locator('div.sticky').filter({ has: page.getByRole('button', { name: copy.modalities[1], exact: true }) }).first();
    await quickFilters.getByRole('button', { name: copy.areas[0], exact: true }).click();
    await quickFilters.getByRole('button', { name: copy.modalities[1], exact: true }).click();
    await quickFilters.getByRole('button', { name: copy.applyJobs }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('category')).toBe('empleo');
    await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe('Tecnología Remoto');
  });
}

for (const lang of ['es', 'zh', 'ar', 'ru']) {
  test(`empleos ${lang} copy fits mobile`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile');
    await setLanguage(page, lang);
    await mockJobsApi(page);
    await page.goto('/empleos', { waitUntil: 'domcontentloaded' });
    await expectDocumentLanguage(page, lang);
    const hero = getVerticalCopy(lang, 'empleos');
    const copy = getEmpleosLandingCopy(lang);
    await expect(page.getByRole('heading', { level: 1, name: hero.title })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.subsections[0], exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: copy.employerTitle })).toBeVisible();
    await expectNoOverflow(page);
  });
}
