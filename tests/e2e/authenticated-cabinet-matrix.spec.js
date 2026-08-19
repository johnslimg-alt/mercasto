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
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'tablet-768-portrait', width: 768, height: 1024 },
  { name: 'tablet-820-portrait', width: 820, height: 1180 },
  { name: 'tablet-1024-landscape', width: 1024, height: 768 },
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-430', width: 430, height: 932 },
];

const representativeProjectViewports = {
  'chromium-mobile-cabinet': new Set(['mobile-390']),
  'webkit-desktop-cabinet': new Set(['desktop-1440']),
  'webkit-mobile-cabinet': new Set(['mobile-390']),
};

function supportsViewport(projectName, viewportName) {
  if (projectName === 'chromium-layout-cabinet') return true;
  return representativeProjectViewports[projectName]?.has(viewportName) ?? false;
}

async function authenticate(request, role) {
  const maxAttempts = 6;
  let response;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    response = await request.post(`${API_BASE_URL}/login`, { data: credentials[role] });
    if (response.ok() || response.status() !== 429 || attempt === maxAttempts) break;

    const payload = await response.json().catch(() => ({}));
    const retryAfterHeader = Number(response.headers()['retry-after'] || 0);
    const retryAfterBody = Number(payload?.retry_after || 0);
    const retryAfterSeconds = Math.max(1, retryAfterHeader, retryAfterBody);
    await new Promise(resolve => setTimeout(resolve, retryAfterSeconds * 1000));
  }

  expect(response?.ok(), `${role} login status=${response?.status() ?? 'unavailable'}`).toBeTruthy();
  const payload = await response.json();
  return { token: payload.access_token || payload.token, user: payload.user };
}

async function installSession(page, session, theme = 'light') {
  await page.addInitScript(({ token, user, theme }) => {
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('theme', theme);
  }, { ...session, theme });
}

async function expectNoHorizontalOverflow(page) {
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBeLessThanOrEqual(1);
}

async function expectDarkThemeIntegrity(page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBeTruthy();
  const brightSurfaces = await page.evaluate(() => {
    const findings = [];
    for (const element of document.querySelectorAll('body *')) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width < 80 || rect.height < 24 || style.display === 'none' || style.visibility === 'hidden') continue;
      const match = style.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
      if (!match) continue;
      const [red, green, blue] = match.slice(1, 4).map(Number);
      const alpha = match[4] === undefined ? 1 : Number(match[4]);
      if (alpha > 0.2 && Math.min(red, green, blue) >= 175) {
        findings.push({
          tag: element.tagName,
          background: style.backgroundColor,
          className: String(element.className || '').slice(0, 140),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
        if (findings.length >= 10) break;
      }
    }
    return findings;
  });
  expect(brightSurfaces, `Unexpected bright surfaces in dark theme: ${JSON.stringify(brightSurfaces)}`).toEqual([]);
}

function watchPageErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  return errors;
}

async function capture(page, viewport, role, screen, projectName) {
  await mkdir(evidenceRoot, { recursive: true });
  const safe = String(screen).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  await page.screenshot({
    path: path.join(evidenceRoot, `${projectName}-${viewport.name}-${role}-${safe}.jpg`),
    type: 'jpeg',
    quality: 65,
    fullPage: true,
  });
}
test('fresh session applies the theme on the first toggle click', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => {
    localStorage.removeItem('theme');
    localStorage.setItem('lang', 'es');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
  });
  await page.goto('/');

  const mobile = testInfo.project.name.includes('mobile');
  const toggle = page.getByTestId(mobile ? 'mobile-theme-toggle' : 'desktop-theme-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBeFalsy();

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => ({
    dark: document.documentElement.classList.contains('dark'),
    stored: localStorage.getItem('theme'),
  }))).toEqual({ dark: true, stored: 'dark' });

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => page.evaluate(() => ({
    dark: document.documentElement.classList.contains('dark'),
    stored: localStorage.getItem('theme'),
  }))).toEqual({ dark: false, stored: 'light' });
});

const sellerTabs = ['my_ads', 'favorites', 'saved_searches', 'stats', 'transactions', 'contact_history', 'reviews', 'privacy', 'settings'];

for (const viewport of viewports) {
  test(`seller cabinet tabs work at ${viewport.name}`, async ({ page, request }, testInfo) => {
    test.skip(!supportsViewport(testInfo.project.name, viewport.name), 'Viewport covered by the full Chromium layout project.');
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
      await capture(page, viewport, 'seller', tabId, testInfo.project.name);
    }
    expect(errors).toEqual([]);
  });
}
const adminTabs = ['categories', 'users', 'moderation', 'coupons', 'reports', 'payments', 'seo_geo', 'business_verifications'];

for (const viewport of viewports) {
  test(`admin cabinet tabs work at ${viewport.name}`, async ({ page, request }, testInfo) => {
    test.skip(!supportsViewport(testInfo.project.name, viewport.name), 'Viewport covered by the full Chromium layout project.');
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
      await capture(page, viewport, 'admin', tabId, testInfo.project.name);
    }
    expect(errors).toEqual([]);
  });
}
const marketingSections = ['dashboard', 'connections', 'campaigns', 'creatives', 'audiences', 'tracking', 'budgets', 'tests', 'automations', 'ai'];

for (const viewport of viewports) {
  test(`advertising hub navigation works at ${viewport.name}`, async ({ page, request }, testInfo) => {
    test.skip(!supportsViewport(testInfo.project.name, viewport.name), 'Viewport covered by the full Chromium layout project.');
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
      await capture(page, viewport, 'marketing', section, testInfo.project.name);
    }
    expect(errors).toEqual([]);
  });
}
const buyerTabs = ['favorites', 'saved_searches', 'contact_history', 'privacy', 'settings'];

for (const viewport of viewports) {
  test(`buyer cabinet tabs work at ${viewport.name}`, async ({ page, request }, testInfo) => {
    test.skip(!supportsViewport(testInfo.project.name, viewport.name), 'Viewport covered by the full Chromium layout project.');
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
      await capture(page, viewport, 'buyer', tabId, testInfo.project.name);
    }
    expect(errors).toEqual([]);
  });
}

const darkThemeViewports = [
  { name: 'desktop-1440-dark', width: 1440, height: 900 },
  { name: 'mobile-390-dark', width: 390, height: 844 },
];

const darkThemeCases = [
  { name: 'seller', role: 'seller', path: '/profile', prefix: 'dashboard-tab-', tabs: sellerTabs, marker: 'dashboard-ai-brand-message' },
  { name: 'buyer', role: 'buyer', path: '/profile', prefix: 'dashboard-tab-', tabs: buyerTabs, marker: 'dashboard-ai-brand-message' },
  { name: 'admin', role: 'admin', path: '/admin', prefix: 'admin-tab-', tabs: adminTabs },
  { name: 'marketing', role: 'admin', path: '/admin/marketing?section=dashboard', prefix: 'marketing-section-', tabs: marketingSections },
];

for (const viewport of darkThemeViewports) {
  for (const cabinet of darkThemeCases) {
    test(`${cabinet.name} dark theme stays visually safe at ${viewport.name}`, async ({ page, request }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-layout-cabinet', 'Dark visual guard runs once in Chromium layout coverage.');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const errors = watchPageErrors(page);
      await installSession(page, await authenticate(request, cabinet.role), 'dark');
      await page.goto(cabinet.path);
      if (cabinet.marker) await expect(page.getByTestId(cabinet.marker)).toBeVisible();
      else if (cabinet.name === 'admin') await expect(page.locator('main')).toBeVisible();
      else await expect(page.getByText('Mercasto Marketing', { exact: true })).toBeVisible();
      await expectDarkThemeIntegrity(page);

      for (const tabId of cabinet.tabs) {
        const button = page.getByTestId(`${cabinet.prefix}${tabId}`);
        await expect(button).toBeVisible();
        await button.click();
        await expect(button).toHaveAttribute('aria-pressed', 'true');
        await expectNoHorizontalOverflow(page);
        await expectDarkThemeIntegrity(page);
        await capture(page, viewport, cabinet.name, `dark-${tabId}`, testInfo.project.name);
      }
      expect(errors).toEqual([]);
    });
  }
}
