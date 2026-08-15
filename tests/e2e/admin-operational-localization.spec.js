import { expect, test } from '@playwright/test';
import { ADMIN_OPERATIONAL_COPY } from '../../src/utils/adminOperationalCopy.js';
import { SUPPORTED_LANGUAGES } from '../../src/utils/translations.js';

const adminUser = { id: 991, name: 'Admin QA', email: 'admin-qa@example.test', role: 'admin', is_verified: true };
const recoveryTranslations = {};
for (const lang of ['es', 'en']) {
  recoveryTranslations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

async function installAdmin(page, lang) {
  await page.addInitScript(({ savedLang, user }) => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
    localStorage.setItem('auth_token', 'admin-operational-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, { savedLang: lang, user: adminUser });
}

async function mockApi(page) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/user') && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminUser) });
    }
    if (path.endsWith('/admin/marketing/meta/status')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ configured: false, provider: 'meta' }) });
    }
    if (path.endsWith('/admin/seo-measurement')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    }
    if (path.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    if (path.endsWith('/categories') || path.endsWith('/category-attributes') || path.endsWith('/favorites')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ providers: { google: false, apple: false, telegram: false, sms: false } }) });
    }
    if (path.includes('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
}

async function expectDocumentLocale(page, lang) {
  await expect.poll(() => page.locator('html').getAttribute('lang')).toBe(lang === 'es' ? 'es-MX' : lang);
  await expect.poll(() => page.locator('html').getAttribute('dir')).toBe(lang === 'ar' ? 'rtl' : 'ltr');
}

for (const lang of SUPPORTED_LANGUAGES) {
  test(`Advertising Hub follows ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    const copy = ADMIN_OPERATIONAL_COPY[lang].marketing;
    await installAdmin(page, lang);
    await mockApi(page);
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto('/admin/marketing?section=dashboard', { waitUntil: 'domcontentloaded' });

    await expectDocumentLocale(page, lang);
    await expect(page.getByText(copy.headerDesc, { exact: true })).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId('marketing-section-dashboard')).toContainText(copy.sections.dashboard.label);
    await expect(page.getByText(copy.connectionsTitle, { exact: true })).toBeVisible();
    await expect(page.getByText(copy.noCampaigns, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
}

async function mockAdminRecoveryApi(page, recovered) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path.endsWith('/user') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminUser) });
    }

    const recoverySurface = path.endsWith('/users') ? 'users'
      : path.endsWith('/admin/ads/pending') ? 'moderation'
        : path.endsWith('/admin/coupons') ? 'coupons'
          : (path.endsWith('/admin/reports') || path.endsWith('/admin/user-reports')) ? 'reports'
            : path.endsWith('/admin/payments') ? 'payments'
              : null;

    if (recoverySurface && method === 'GET') {
      if (!recovered.has(recoverySurface)) {
        return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'temporarily unavailable' }) });
      }
      await new Promise(resolve => setTimeout(resolve, 650));
      if (recoverySurface === 'payments') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], last_page: 1, total: 0 }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }

    if (path.endsWith('/admin/analytics')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ revenue_period: 0, promotion_revenue_period: 0, ctr: 0, total_clicks: 0, total_impressions: 0 }) });
    }
    if (path.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    if (path.endsWith('/categories') || path.endsWith('/category-attributes') || path.endsWith('/favorites') || path.endsWith('/user/ads') || path.endsWith('/user/favorite-ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/user/payments')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], last_page: 1, total: 0 }) });
    }
    if (path.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ providers: { google: false, apple: false, telegram: false, sms: false } }) });
    }
    if (path.includes('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
}

const adminRecoverySurfaces = [
  { id: 'users', emptyTestId: 'admin-users-empty' },
  { id: 'moderation', emptyTestId: 'admin-moderation-empty' },
  { id: 'coupons', emptyTestId: 'admin-coupons-empty' },
  { id: 'reports', emptyTestId: 'admin-reports-ads-empty' },
  { id: 'payments', emptyTestId: 'admin-payments-empty' },
];

for (const lang of ['es', 'en']) {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`admin data tabs distinguish failure, retry loading and real empty in ${lang} on ${viewport.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-desktop');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installAdmin(page, lang);
      const recovered = new Set();
      await mockAdminRecoveryApi(page, recovered);
      await page.goto('/admin', { waitUntil: 'domcontentloaded' });
      await expectDocumentLocale(page, lang);
      const t = recoveryTranslations[lang];

      for (const surface of adminRecoverySurfaces) {
        await page.getByTestId(`admin-tab-${surface.id}`).click();
        await expect(page.getByTestId(`admin-${surface.id}-load-error`)).toContainText(t.connection_error);
        await expect(page.getByTestId(surface.emptyTestId)).toHaveCount(0);
        await expect(page.getByTestId(`admin-${surface.id}-retry`)).toHaveText(t.retry_btn);

        recovered.add(surface.id);
        await page.getByTestId(`admin-${surface.id}-retry`).click();
        await expect(page.getByTestId(`admin-${surface.id}-loading`)).toBeVisible();
        await expect(page.getByTestId(`admin-${surface.id}-load-error`)).toHaveCount(0);
        await expect(page.getByTestId(surface.emptyTestId)).toBeVisible();
      }
    });
  }
}

async function mockAdminAnalyticsRecoveryApi(page, state) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();

    if (path.endsWith('/user') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(adminUser) });
    }
    if (path.endsWith('/admin/payments') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], last_page: 1, total: 0 }) });
    }
    if (path.endsWith('/admin/analytics') && method === 'GET') {
      if (!state.recovered) {
        return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'temporarily unavailable' }) });
      }
      await new Promise(resolve => setTimeout(resolve, 650));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ revenue_period: 0, promotion_revenue_period: 0, ctr: 0, total_clicks: 0, total_impressions: 0 }) });
    }
    if (path.endsWith('/ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, current_page: 1, last_page: 1 }) });
    }
    if (path.endsWith('/categories') || path.endsWith('/category-attributes') || path.endsWith('/favorites') || path.endsWith('/user/ads') || path.endsWith('/user/favorite-ads')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (path.endsWith('/user/payments')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], last_page: 1, total: 0 }) });
    }
    if (path.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ providers: { google: false, apple: false, telegram: false, sms: false } }) });
    }
    if (path.includes('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
}

for (const lang of ['es', 'en']) {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`admin analytics outage does not become real zero KPI in ${lang} on ${viewport.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium-desktop');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installAdmin(page, lang);
      const state = { recovered: false };
      await mockAdminAnalyticsRecoveryApi(page, state);
      await page.goto('/admin', { waitUntil: 'domcontentloaded' });
      await expectDocumentLocale(page, lang);
      const t = recoveryTranslations[lang];

      await page.getByTestId('admin-tab-payments').click();
      await expect(page.getByTestId('admin-payments-empty')).toBeVisible();
      await expect(page.getByTestId('admin-analytics-load-error')).toContainText(t.connection_error);
      await expect(page.getByTestId('admin-analytics-retry')).toHaveText(t.retry_btn);
      await expect(page.getByTestId('admin-promotion-revenue-value')).toHaveText('—');
      await expect(page.getByTestId('admin-ctr-value')).toHaveText('—');
      await expect(page.getByTestId('admin-ctr-detail')).toHaveText('—');

      state.recovered = true;
      await page.getByTestId('admin-analytics-retry').click();
      await expect(page.getByTestId('admin-analytics-loading')).toBeVisible();
      await expect(page.getByTestId('admin-analytics-load-error')).toHaveCount(0);
      await expect(page.getByTestId('admin-promotion-revenue-value')).not.toHaveText('—');
      await expect(page.getByTestId('admin-ctr-value')).not.toHaveText('—');
      await expect(page.getByTestId('admin-payments-empty')).toBeVisible();
    });
  }
}


for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`smart moderation dialog traps focus and restores its opener on ${viewport.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installAdmin(page, 'en');
    await mockApi(page);
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });

    const opener = page.getByTestId('admin-smart-moderation-open');
    await expect(opener).toBeVisible();
    await opener.focus();
    await opener.click();
    const dialog = page.getByTestId('admin-smart-moderation-dialog');
    const closeButton = page.getByTestId('admin-smart-moderation-close');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-labelledby', 'admin-smart-moderation-title');
    await expect(closeButton).toBeFocused();
    await closeButton.press('Shift+Tab');
    await expect.poll(() => dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`admin form controls have accessible names on ${viewport.name}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installAdmin(page, 'en');
    await mockApi(page);
    await page.goto('/admin');
    const tabs = ['categories', 'users', 'moderation', 'coupons', 'reports', 'payments', 'seo_geo', 'business_verifications'];
    const unnamed = [];
    for (const tab of tabs) {
      const button = page.getByTestId(`admin-tab-${tab}`);
      if (await button.count()) await button.click();
      const controls = await page.locator('input:visible:not([type="hidden"]), select:visible, textarea:visible').evaluateAll((elements) => elements.map((element) => {
        const id = element.id;
        const explicitLabel = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
        const wrappingLabel = element.closest('label');
        return {
          aria: (element.getAttribute('aria-label') || '').trim(),
          labelledby: (element.getAttribute('aria-labelledby') || '').trim(),
          title: (element.getAttribute('title') || '').trim(),
          label: (explicitLabel?.textContent || wrappingLabel?.textContent || '').trim(),
          html: element.outerHTML.slice(0, 260),
        };
      }));
      controls.forEach(control => {
        if (!control.aria && !control.labelledby && !control.title && !control.label) unnamed.push({ tab, html: control.html });
      });
      const unnamedButtons = await page.locator('button:visible').evaluateAll((buttons) => buttons.map((button) => ({
        text: (button.textContent || '').trim(),
        aria: (button.getAttribute('aria-label') || '').trim(),
        title: (button.getAttribute('title') || '').trim(),
        html: button.outerHTML.slice(0, 260),
      })).filter(button => !button.text && !button.aria && !button.title));
      unnamedButtons.forEach(button => unnamed.push({ tab, html: button.html }));
    }
    expect(unnamed, `unnamed admin form/button controls: ${JSON.stringify(unnamed, null, 2)}`).toEqual([]);
  });
}


for (const viewport of [
  { name: 'desktop', width: 1280, height: 860 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`Advertising Hub controls expose accessible names on ${viewport.name}`, async ({ page }) => {
    await installAdmin(page, 'es');
    await mockApi(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/admin/marketing?section=dashboard', { waitUntil: 'domcontentloaded' });
    const sections = ['dashboard','connections','campaigns','creatives','audiences','tracking','budgets','tests','automations','ai'];
    const unnamed = [];
    for (const section of sections) {
      await page.getByTestId(`marketing-section-${section}`).click();
      await page.waitForTimeout(30);
      const items = await page.locator('button:visible, a[href]:visible, input:visible, select:visible, textarea:visible').evaluateAll(nodes => nodes.map(node => {
        const id = node.id || '';
        const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.innerText?.trim() || '' : '';
        return { tag: node.tagName.toLowerCase(), text:(node.innerText||'').trim(), aria:(node.getAttribute('aria-label')||'').trim(), labelledby:(node.getAttribute('aria-labelledby')||'').trim(), title:(node.getAttribute('title')||'').trim(), label, type:node.getAttribute('type')||'', html:node.outerHTML.slice(0,260) };
      }));
      for (const item of items) {
        const named = item.text || item.aria || item.labelledby || item.title || item.label;
        if (!named && item.type !== 'hidden') unnamed.push({ section, ...item });
      }
    }
    expect(unnamed, `unnamed Advertising Hub controls: ${JSON.stringify(unnamed, null, 2)}`).toEqual([]);
  });
}


for (const viewport of [
  { name: 'desktop', width: 1280, height: 860 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`dynamic Admin controls expose accessible names on ${viewport.name}`, async ({ page }) => {
    await installAdmin(page, 'es');
    await mockApi(page);
    await page.route('**/api/categories', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 1, slug: 'qa-cat', name: { es: 'QA Categoría', en: 'QA Category' }, icon: 'Star', sort_order: 1 }]) }));
    await page.route('**/api/users?**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 2, name: 'QA Usuario', email: 'qa-user@example.test', role: 'individual', is_verified: false, email_verified: true, kyc_status: 'unverified', active_plan: { name: 'Gratis', monthly_ad_limit: 3 } }] }) }));
    await page.route('**/api/admin/coupons', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 3, code: 'QA100', credits: 100, max_uses: 10, used_count: 0 }]) }));
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    const unnamed = [];
    const scan = async (tab) => {
      const items = await page.locator('button:visible, a[href]:visible, input:visible, select:visible, textarea:visible').evaluateAll(nodes => nodes.map(node => {
        const id=node.id||''; const label=id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.innerText?.trim()||'' : '';
        return {tag:node.tagName.toLowerCase(),text:(node.innerText||'').trim(),aria:(node.getAttribute('aria-label')||'').trim(),labelledby:(node.getAttribute('aria-labelledby')||'').trim(),title:(node.getAttribute('title')||'').trim(),label,type:node.getAttribute('type')||'',html:node.outerHTML.slice(0,300)};
      }));
      for (const item of items) {
        const nativeTextName = item.tag === 'button' || item.tag === 'a' ? item.text : '';
        if (!(nativeTextName || item.aria || item.labelledby || item.title || item.label) && item.type !== 'hidden') unnamed.push({tab,...item});
      }
    };
    await expect(page.getByText('QA Categoría', { exact: true })).toBeVisible();
    await scan('categories');
    await page.getByTestId('admin-tab-users').click();
    await expect(page.getByText('qa-user@example.test', { exact: true })).toBeVisible();
    await scan('users');
    await page.getByTestId('admin-tab-coupons').click();
    await expect(page.getByText('QA100', { exact: true })).toBeVisible();
    await scan('coupons');
    expect(unnamed, `unnamed dynamic Admin controls: ${JSON.stringify(unnamed, null, 2)}`).toEqual([]);
  });
}
