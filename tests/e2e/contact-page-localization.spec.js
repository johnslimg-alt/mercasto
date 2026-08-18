import { test, expect } from '@playwright/test';
import { SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';
import { getContactPageCopy, getContactSubjects } from '../../src/utils/contactPageCopy.js';
import {
  getSupportRequestAcknowledgementCopy,
  getSupportRequestStatusLabel,
} from '../../src/utils/supportRequestAcknowledgementCopy.js';

const SUPPORT_REFERENCE = 'MCS-260818-ABC12345';
const INTERNAL_MESSAGE = 'INTERNAL SERVER MESSAGE MUST NOT RENDER';

async function setLanguage(page, lang) {
  await page.addInitScript(savedLang => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
  }, lang);
}

async function mockApi(page, onContact) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/contact') && request.method() === 'POST') {
      onContact?.(JSON.parse(request.postData() || '{}'));
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          reference: SUPPORT_REFERENCE,
          status: 'received',
          follow_up: 'email',
          queue: 'support',
          message: INTERNAL_MESSAGE,
          ip_hash: 'internal-hash',
        }),
      });
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
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function expectNoOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

for (const lang of SUPPORTED_LANGUAGES) {
  test(`contact page renders and submits canonical subject in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const copy = getContactPageCopy(lang);
    const acknowledgementCopy = getSupportRequestAcknowledgementCopy(lang);
    const subjects = getContactSubjects(lang);
    let submitted = null;
    await setLanguage(page, lang);
    await mockApi(page, body => { submitted = body; });
    await page.goto('/contacto', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 1, name: copy.title, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: copy.formTitle, exact: true })).toBeVisible();
    await expect.poll(() => page.title()).toBe(copy.seoTitle);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', copy.seoDescription);
    await expect(page.getByText(copy.responseValue, { exact: true })).toBeVisible();
    await expect(page.getByText('Menos de 24 horas', { exact: true })).toHaveCount(0);

    const nameField = page.getByRole('textbox', { name: copy.name, exact: true });
    const emailField = page.getByRole('textbox', { name: copy.email, exact: true });
    const subjectField = page.getByRole('combobox', { name: copy.subject, exact: true });
    const messageField = page.getByRole('textbox', { name: copy.message, exact: true });
    await expect(nameField).toBeVisible();
    await expect(emailField).toBeVisible();
    await expect(subjectField).toBeVisible();
    await expect(messageField).toBeVisible();
    await expect(nameField).toHaveAttribute('required', '');
    await expect(emailField).toHaveAttribute('required', '');
    await expect(subjectField).toHaveAttribute('required', '');
    await expect(messageField).toHaveAttribute('required', '');

    await nameField.fill('QA User');
    await emailField.fill('qa@example.com');
    await subjectField.selectOption(subjects[1].value);
    await messageField.fill('QA localized contact message');
    await page.getByRole('button', { name: copy.send, exact: true }).click();

    await expect(page.getByText(copy.successTitle, { exact: true })).toBeVisible();
    await expect(page.getByText(copy.successMessage, { exact: true })).toBeVisible();
    await expect(page.getByTestId('contact-reference')).toContainText(acknowledgementCopy.referenceLabel);
    await expect(page.getByTestId('contact-reference')).toContainText(SUPPORT_REFERENCE);
    await expect(page.getByTestId('contact-status')).toContainText(acknowledgementCopy.statusLabel);
    await expect(page.getByTestId('contact-status')).toContainText(getSupportRequestStatusLabel(lang, 'received'));
    await expect(page.getByTestId('contact-follow-up')).toHaveText(acknowledgementCopy.followUp);
    await expect(page.getByText(INTERNAL_MESSAGE, { exact: true })).toHaveCount(0);
    await expect(page.getByText('support', { exact: true })).toHaveCount(0);
    await expect(page.getByText('internal-hash', { exact: true })).toHaveCount(0);
    await expect.poll(() => submitted?.subject).toBe('Problema técnico');
    await expectNoOverflow(page);
  });
}

for (const lang of ['es', 'zh', 'ar', 'ru']) {
  test(`contact page ${lang} fits mobile and RTL`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-mobile');
    const copy = getContactPageCopy(lang);
    await setLanguage(page, lang);
    await mockApi(page);
    await page.goto('/contacto', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: copy.title, exact: true })).toBeVisible();
    const expectedDir = lang === 'ar' ? 'rtl' : 'ltr';
    await expect.poll(() => page.locator('html').getAttribute('dir')).toBe(expectedDir);
    await expectNoOverflow(page);
  });
}
