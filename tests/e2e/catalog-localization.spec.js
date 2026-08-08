import { test, expect } from '@playwright/test';

const LANGUAGES = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja'];
const RTL_LANGUAGES = new Set(['ar']);
const translations = {};

for (const lang of LANGUAGES) {
  translations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

for (const lang of LANGUAGES) {
  test(`catalog localization renders ${lang} without desktop overflow`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await page.addInitScript((savedLang) => localStorage.setItem('lang', savedLang), lang);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/listings');

    const t = translations[lang];
    await expect(page.getByTestId('catalog-map-toggle')).toContainText(t.hide_map);
    await expect(page.getByTestId('catalog-grid-view')).toContainText(t.grid);
    await expect(page.getByTestId('catalog-list-view')).toContainText(t.list);
    await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr');
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(lang === 'es' ? 'es-MX' : lang);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

for (const lang of LANGUAGES) {
  test(`catalog localization renders ${lang} without mobile overflow`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await page.addInitScript((savedLang) => localStorage.setItem('lang', savedLang), lang);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/listings');

    const t = translations[lang];
    await expect(page.getByTestId('catalog-map-toggle')).toContainText(t.open_map);
    await expect(page.getByTestId('catalog-mobile-filters')).toContainText(t.filters);
    await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr');
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(lang === 'es' ? 'es-MX' : lang);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
