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
    const alphaValue = (raw, percent) => raw === undefined ? 1 : (percent ? Number(raw) / 100 : Number(raw));
    const linearToByte = value => {
      const clipped = Math.max(0, Math.min(1, value));
      const srgb = clipped <= 0.0031308 ? 12.92 * clipped : 1.055 * Math.pow(clipped, 1 / 2.4) - 0.055;
      return Math.round(srgb * 255);
    };
    const oklabToRgb = (lightness, a, b) => {
      let l = lightness + 0.3963377774 * a + 0.2158037573 * b;
      let m = lightness - 0.1055613458 * a - 0.0638541728 * b;
      let s = lightness - 0.0894841775 * a - 1.291485548 * b;
      l = l * l * l;
      m = m * m * m;
      s = s * s * s;
      return [
        linearToByte(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        linearToByte(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        linearToByte(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
      ];
    };
    const parseColor = value => {
      const color = String(value || '').trim().toLowerCase();
      const rgb = color.match(/^rgba?\(\s*([\d.]+)(%)?[\s,]+([\d.]+)(%)?[\s,]+([\d.]+)(%)?(?:\s*[,/]\s*([\d.]+)(%)?)?\s*\)$/);
      if (rgb) {
        const channel = (raw, percent) => percent ? Number(raw) * 2.55 : Number(raw);
        return {
          rgb: [channel(rgb[1], rgb[2]), channel(rgb[3], rgb[4]), channel(rgb[5], rgb[6])],
          alpha: alphaValue(rgb[7], rgb[8]),
        };
      }
      const oklch = color.match(/^oklch\(\s*([\d.]+)(%)?\s+([\d.]+)(%)?\s+([-\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+)(%)?)?\s*\)$/);
      if (oklch) {
        const lightness = oklch[2] ? Number(oklch[1]) / 100 : Number(oklch[1]);
        const chroma = oklch[4] ? Number(oklch[3]) * 0.004 : Number(oklch[3]);
        const hue = Number(oklch[5]) * Math.PI / 180;
        return {
          rgb: oklabToRgb(lightness, chroma * Math.cos(hue), chroma * Math.sin(hue)),
          alpha: alphaValue(oklch[6], oklch[7]),
        };
      }
      const oklab = color.match(/^oklab\(\s*([\d.]+)(%)?\s+([-\d.]+)(%)?\s+([-\d.]+)(%)?(?:\s*\/\s*([\d.]+)(%)?)?\s*\)$/);
      if (oklab) {
        const lightness = oklab[2] ? Number(oklab[1]) / 100 : Number(oklab[1]);
        const a = oklab[4] ? Number(oklab[3]) * 0.004 : Number(oklab[3]);
        const b = oklab[6] ? Number(oklab[5]) * 0.004 : Number(oklab[5]);
        return { rgb: oklabToRgb(lightness, a, b), alpha: alphaValue(oklab[7], oklab[8]) };
      }
      const srgb = color.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)(%)?)?\s*\)$/);
      if (srgb) {
        return {
          rgb: [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255],
          alpha: alphaValue(srgb[4], srgb[5]),
        };
      }
      return color === 'transparent' ? { rgb: [0, 0, 0], alpha: 0 } : null;
    };

    for (const element of document.querySelectorAll('body *')) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width < 80 || rect.height < 24 || style.display === 'none' || style.visibility === 'hidden') continue;
      const parsed = parseColor(style.backgroundColor);
      if (!parsed) {
        findings.push({
          tag: element.tagName,
          background: style.backgroundColor,
          reason: 'unsupported-color-format',
          className: String(element.className || '').slice(0, 140),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
        if (findings.length >= 10) break;
        continue;
      }
      const [red, green, blue] = parsed.rgb;
      if (parsed.alpha > 0.2 && Math.min(red, green, blue) >= 175) {
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

const adminTabs = ['categories', 'users', 'moderation', 'coupons', 'reports', 'payments', 'seo_geo', 'kyc', 'business_verifications'];
const adminDataRequestPaths = {
  users: ['/api/users'],
  moderation: ['/api/admin/ads/pending'],
  coupons: ['/api/admin/coupons'],
  reports: ['/api/admin/reports', '/api/admin/user-reports'],
  payments: ['/api/admin/payments'],
  seo_geo: ['/api/admin/seo-measurement'],
  kyc: ['/api/admin/kyc'],
  business_verifications: ['/api/admin/business-verifications'],
};
const adminLoadingTestIds = {
  users: 'admin-users-loading',
  moderation: 'admin-moderation-loading',
  coupons: 'admin-coupons-loading',
  reports: 'admin-reports-loading',
  payments: 'admin-payments-loading',
  kyc: 'admin-kyc-loading',
  business_verifications: 'admin-business-verifications-loading',
};

async function clickAdminTabAndWaitForData(page, button, tabId) {
  const paths = adminDataRequestPaths[tabId] || [];
  const pendingResponses = paths.map(expectedPath => page.waitForResponse(response => {
    if (response.request().method() !== 'GET') return false;
    try {
      return new URL(response.url()).pathname === expectedPath;
    } catch {
      return false;
    }
  }));

  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');

  const responses = await Promise.all(pendingResponses);
  for (const response of responses) {
    expect(response.ok(), `${tabId} data request failed: ${response.status()} ${response.url()}`).toBeTruthy();
    await response.finished();
  }

  const loadingTestId = adminLoadingTestIds[tabId];
  if (loadingTestId) await expect(page.getByTestId(loadingTestId)).toBeHidden();
}

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
      await clickAdminTabAndWaitForData(page, button, tabId);
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
        if (cabinet.name === 'admin') {
          await clickAdminTabAndWaitForData(page, button, tabId);
        } else {
          await button.click();
          await expect(button).toHaveAttribute('aria-pressed', 'true');
        }
        await expectNoHorizontalOverflow(page);
        await expectDarkThemeIntegrity(page);
        await capture(page, viewport, cabinet.name, `dark-${tabId}`, testInfo.project.name);
      }
      expect(errors).toEqual([]);
    });
  }
}
