import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:18000/api';
const isolated = process.env.E2E_ISOLATED_STACK === '1';
const evidenceRoot = process.env.EVIDENCE_OUTPUT || 'test-results/authenticated-cabinets';
test.skip(!isolated, 'Authenticated cabinet matrix is isolated-stack only.');

const credentials = {
  seller: {
    email: process.env.E2E_SELLER_EMAIL || 'seller_e2e@mercasto.com',
    password: process.env.E2E_SELLER_PASSWORD || 'E2eTestPass99!',
  },
  buyer: {
    email: process.env.E2E_BUYER_EMAIL || 'buyer_e2e@mercasto.com',
    password: process.env.E2E_BUYER_PASSWORD || 'E2eTestPass99!',
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin_e2e@mercasto.com',
    password: process.env.E2E_ADMIN_PASSWORD || 'E2eTestPass99!',
  },
};

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
];
async function authenticate(request, role) {
  const response = await request.post(`${API_BASE_URL}/login`, { data: credentials[role] });
  expect(response.ok(), `${role} login`).toBeTruthy();
  const payload = await response.json();
  return { token: payload.access_token || payload.token, user: payload.user };
}

async function installSession(page, session) {
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, session);
}

async function expectNoHorizontalOverflow(page) {
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(1);
}

function watchPageErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  return errors;
}

async function capture(page, viewport, role, screen) {
  await mkdir(evidenceRoot, { recursive: true });
  const safe = String(screen).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  await page.screenshot({
    path: path.join(evidenceRoot, `${viewport.name}-${role}-${safe}.jpg`),
    type: 'jpeg',
    quality: 65,
    fullPage: true,
  });
}
const sellerTabs = ['my_ads', 'favorites', 'saved_searches', 'stats', 'transactions', 'contact_history', 'reviews', 'privacy', 'settings'];

for (const viewport of viewports) {
  test(`seller cabinet tabs work at ${viewport.name}`, async ({ page, request }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = watchPageErrors(page);
    await installSession(page, await authenticate(request, 'seller'));
    await page.goto('/profile');
    await expect(page.getByTestId('dashboard-ai-brand-message')).toBeVisible();

    for (const tabId of sellerTabs) {
      const button = page.getByTestId(`dashboard-tab-${tabId}`);
      await expect(button).toBeVisible();
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expectNoHorizontalOverflow(page);
      await capture(page, viewport, 'seller', tabId);
    }
    expect(errors).toEqual([]);
  });
}
const adminTabs = ['categories', 'users', 'moderation', 'coupons', 'reports', 'payments', 'seo_geo', 'business_verifications'];

for (const viewport of viewports) {
  test(`admin cabinet tabs work at ${viewport.name}`, async ({ page, request }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = watchPageErrors(page);
    await installSession(page, await authenticate(request, 'admin'));
    await page.goto('/admin');
    await expect(page.locator('main')).toBeVisible();

    for (const tabId of adminTabs) {
      const button = page.getByTestId(`admin-tab-${tabId}`);
      await expect(button).toBeVisible();
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expectNoHorizontalOverflow(page);
      await capture(page, viewport, 'admin', tabId);
    }
    expect(errors).toEqual([]);
  });
}
const marketingSections = ['dashboard', 'connections', 'campaigns', 'creatives', 'audiences', 'tracking', 'budgets', 'tests', 'automations', 'ai'];

for (const viewport of viewports) {
  test(`advertising hub navigation works at ${viewport.name}`, async ({ page, request }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = watchPageErrors(page);
    await installSession(page, await authenticate(request, 'admin'));
    await page.goto('/admin/marketing?section=dashboard');
    await expect(page.getByText('Mercasto Marketing', { exact: true })).toBeVisible();

    for (const section of marketingSections) {
      const button = page.getByTestId(`marketing-section-${section}`);
      await expect(button).toBeVisible();
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page).toHaveURL(new RegExp(`section=${section}`));
      await expectNoHorizontalOverflow(page);
      await capture(page, viewport, 'marketing', section);
    }
    expect(errors).toEqual([]);
  });
}
const buyerTabs = ['favorites', 'saved_searches', 'contact_history', 'privacy', 'settings'];

for (const viewport of viewports) {
  test(`buyer cabinet tabs work at ${viewport.name}`, async ({ page, request }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const errors = watchPageErrors(page);
    await installSession(page, await authenticate(request, 'buyer'));
    await page.goto('/profile');
    await expect(page.getByTestId('dashboard-ai-brand-message')).toBeVisible();

    for (const tabId of buyerTabs) {
      const button = page.getByTestId(`dashboard-tab-${tabId}`);
      await expect(button).toBeVisible();
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expectNoHorizontalOverflow(page);
      await capture(page, viewport, 'buyer', tabId);
    }
    expect(errors).toEqual([]);
  });
}