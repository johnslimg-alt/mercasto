import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173';
const apiBaseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:18000/api';
const commit = process.env.EVIDENCE_COMMIT || 'unknown';
const evidenceDate = process.env.EVIDENCE_DATE || new Date().toISOString().slice(0, 10);
const outputRoot = process.env.EVIDENCE_OUTPUT
  || path.join('docs', 'evidence', 'ui-visual-qa', `${evidenceDate}-authenticated-${commit.slice(0, 8)}`);

const credentials = {
  seller: {
    email: process.env.E2E_SELLER_EMAIL,
    password: process.env.E2E_SELLER_PASSWORD,
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD,
  },
};

for (const [role, values] of Object.entries(credentials)) {
  if (!values.email || !values.password) throw new Error(`Missing ${role} E2E credentials.`);
}

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 412, height: 915 },
];

const screens = [
  {
    name: 'publish',
    path: '/post',
    role: 'seller',
    marker: /Pon tu anuncio/i,
    selector: 'main h2',
  },
  {
    name: 'my-ads',
    path: '/profile?tab=my_ads',
    role: 'seller',
    marker: /Panel de Usuario/i,
    selector: 'main h1',
  },
  {
    name: 'admin-dashboard',
    path: '/admin',
    role: 'admin',
    marker: /Añadir Nueva Categoría|Categorías Existentes/i,
    selector: 'main input[placeholder="ej. deportes-extremos"]',
  },
];

async function login(role) {
  const response = await fetch(`${apiBaseUrl}/login`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials[role]),
  });
  const payload = await response.json();
  if (!response.ok || !payload.user || !(payload.access_token || payload.token)) {
    throw new Error(`Unable to authenticate ${role}: HTTP ${response.status}`);
  }
  return { token: payload.access_token || payload.token, user: payload.user };
}

const sessions = {
  seller: await login('seller'),
  admin: await login('admin'),
};

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of viewports) {
  for (const screen of screens) {
    const session = sessions[screen.role];
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      locale: 'es-MX',
      colorScheme: 'light',
    });
    await context.addInitScript(({ token, user }) => {
      localStorage.setItem('lang', 'es');
      localStorage.setItem('mercasto_language', 'es');
      localStorage.setItem('cookie_consent', 'essential');
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }, session);

    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const sameOriginFailures = [];
    const expectedNetworkAborts = [];
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', error => pageErrors.push(String(error)));
    page.on('requestfailed', request => {
      if (!(request.url().startsWith(baseUrl) || request.url().startsWith(apiBaseUrl))) return;

      const errorText = request.failure()?.errorText || 'failed';
      const requestUrl = new URL(request.url());
      const apiUrl = new URL(apiBaseUrl);
      const expectedAdsAbort = request.method() === 'GET'
        && errorText === 'net::ERR_ABORTED'
        && requestUrl.origin === apiUrl.origin
        && requestUrl.pathname === `${apiUrl.pathname.replace(/\/$/, '')}/ads`;
      const failure = `${request.method()} ${request.url()} :: ${errorText}`;

      if (expectedAdsAbort) expectedNetworkAborts.push(failure);
      else sameOriginFailures.push(failure);
    });

    const response = await page.goto(new URL(screen.path, baseUrl).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForTimeout(1800);
    await page.locator(screen.selector).first().waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForFunction(
      ({ source, flags }) => new RegExp(source, flags).test(document.body.innerText),
      { source: screen.marker.source, flags: screen.marker.flags },
      { timeout: 15_000 },
    );

    const metrics = await page.evaluate(() => {
      const images = [...document.images];
      return {
        title: document.title,
        language: document.documentElement.lang,
        overflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        brokenImages: images.filter(image => image.complete && image.naturalWidth === 0).map(image => image.currentSrc || image.src),
        emptyHrefs: [...document.querySelectorAll('a')]
          .filter(anchor => !anchor.getAttribute('href')?.trim())
          .map(anchor => anchor.textContent?.trim() || anchor.outerHTML.slice(0, 120)),
        bodyHas404: /Error 404|No encontrado|Not found/i.test(document.body.innerText),
        bodyTextSample: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 320),
      };
    });

    const imageName = `${viewport.name}-${screen.name}.jpg`;
    await page.screenshot({ path: path.join(outputRoot, imageName), type: 'jpeg', quality: 72 });
    results.push({
      viewport: viewport.name,
      width: viewport.width,
      height: viewport.height,
      screen: screen.name,
      role: screen.role,
      requestedPath: screen.path,
      finalUrl: page.url(),
      status: response?.status() ?? null,
      screenshot: imageName,
      ...metrics,
      consoleErrors,
      pageErrors,
      sameOriginFailures,
      expectedNetworkAborts,
    });
    await context.close();
  }
}

await browser.close();

const failures = results.filter(result => (
  result.status >= 400
  || result.overflowPx > 1
  || result.brokenImages.length > 0
  || result.bodyHas404
  || result.pageErrors.length > 0
  || result.consoleErrors.length > 0
  || result.sameOriginFailures.length > 0
));

const report = {
  generatedAt: new Date().toISOString(),
  sourceCommit: commit,
  baseUrl,
  apiBaseUrl,
  evidenceState: 'isolated credentialed browser state with disposable PostgreSQL and provider-safe mocks',
  totalScreenshots: results.length,
  failures: failures.length,
  results,
};
await writeFile(path.join(outputRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

const lines = [
  '# Mercasto authenticated UI visual QA evidence',
  '',
  `- Generated: ${report.generatedAt}`,
  `- Source commit: \`${commit}\``,
  `- Frontend: ${baseUrl}`,
  `- API: ${apiBaseUrl}`,
  `- Screenshots: ${results.length}`,
  `- Automated failures: ${failures.length}`,
  '- State: isolated credentialed environment; disposable PostgreSQL and provider-safe mocks; production data was not accessed or mutated.',
  '',
  '| Viewport | Role | Screen | Final URL | HTTP | Overflow | Broken images | Page errors | Screenshot |',
  '|---|---|---|---|---:|---:|---:|---:|---|',
  ...results.map(result => `| ${result.viewport} ${result.width}×${result.height} | ${result.role} | ${result.screen} | \`${result.finalUrl}\` | ${result.status} | ${result.overflowPx}px | ${result.brokenImages.length} | ${result.pageErrors.length} | [view](./${result.screenshot}) |`),
  '',
  '## Scope',
  '',
  '- Seller Publish form authenticated state.',
  '- Seller My Ads dashboard authenticated state.',
  '- Admin dashboard authenticated state.',
  '- Desktop, tablet and mobile viewport coverage.',
];
await writeFile(path.join(outputRoot, 'README.md'), `${lines.join('\n')}\n`);

console.log(JSON.stringify({ outputRoot, screenshots: results.length, failures: failures.length }, null, 2));
if (failures.length > 0) process.exitCode = 1;
