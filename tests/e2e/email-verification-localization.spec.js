import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const languages = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja'];
const copies = Object.fromEntries(languages.map(lang => [
  lang,
  JSON.parse(fs.readFileSync(new URL(`../../src/locales/${lang}.json`, import.meta.url), 'utf8')).verification,
]));

async function setLanguage(page, lang) {
  await page.addInitScript(savedLang => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
  }, lang);
}

async function mockApi(page, verifyResult, onVerify) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/email/verify') && request.method() === 'POST') {
      onVerify?.(JSON.parse(request.postData() || '{}'));
      return route.fulfill(verifyResult);
    }
    if (url.pathname.endsWith('/categories') || url.pathname.endsWith('/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    if (url.pathname.endsWith('/banners')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ banners: [] }) });
    }
    if (url.pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function expectNoOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

for (const lang of languages) {
  test(`email verification success stays localized in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const copy = copies[lang];
    const requests = [];
    await setLanguage(page, lang);
    await mockApi(page, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, message: 'Email verificado correctamente!' }),
    }, body => requests.push(body));
    await page.goto('/verificar-email?token=qa-token&email=qa%40example.com', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 1, name: copy.verified, exact: true })).toBeVisible();
    await expect(page.getByText(copy.success, { exact: true })).toBeVisible();
    await expect(page.getByText(copy.badge, { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: copy.home, exact: true })).toBeVisible();
    await expect(page.getByText('Email verificado correctamente!', { exact: true })).toHaveCount(0);
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toEqual({ token: 'qa-token', email: 'qa@example.com' });
    await expectNoOverflow(page);
  });
}

for (const lang of ['en', 'ru', 'ar', 'zh']) {
  test(`email verification error ignores Spanish backend copy in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const copy = copies[lang];
    await setLanguage(page, lang);
    await mockApi(page, {
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Token inválido o expirado.' }),
    });
    await page.goto('/verificar-email?token=bad-token&email=qa%40example.com', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 1, name: copy.failed, exact: true })).toBeVisible();
    await expect(page.getByText(copy.expired, { exact: true })).toBeVisible();
    await expect(page.getByText(copy.retry, { exact: true })).toBeVisible();
    await expect(page.getByText('Token inválido o expirado.', { exact: true })).toHaveCount(0);
  });
}

for (const lang of ['es', 'zh', 'ar', 'ru']) {
  test(`email verification ${lang} fits mobile and RTL`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile');
    const copy = copies[lang];
    await setLanguage(page, lang);
    await mockApi(page, {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, message: 'Email verificado correctamente!' }),
    });
    await page.goto('/verificar-email?token=qa-token&email=qa%40example.com', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: copy.verified, exact: true })).toBeVisible();
    await expect.poll(() => page.locator('html').getAttribute('dir')).toBe(lang === 'ar' ? 'rtl' : 'ltr');
    await expectNoOverflow(page);
  });
}
