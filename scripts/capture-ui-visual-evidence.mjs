import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.BASE_URL || 'https://mercasto.com';
const commit = process.env.EVIDENCE_COMMIT || 'unknown';
const evidenceDate = process.env.EVIDENCE_DATE || new Date().toISOString().slice(0, 10);
const outputRoot = process.env.EVIDENCE_OUTPUT
  || path.join('docs', 'evidence', 'ui-visual-qa', `${evidenceDate}-${commit.slice(0, 8)}`);

const viewports = [
  { name: 'desktop', width: 1440, height: 1000, deviceScaleFactor: 1 },
  { name: 'tablet', width: 1024, height: 768, deviceScaleFactor: 1 },
  { name: 'mobile', width: 412, height: 915, deviceScaleFactor: 1 },
];

const screens = [
  { name: 'home', path: '/', marker: /Mercasto: compra, vende y renta/i },
  { name: 'listings', path: '/listings', marker: /Filtros/i },
  { name: 'pricing', path: '/tarifas', marker: /Publicar es gratuito durante siete días/i },
  { name: 'login', path: '/login', marker: /Iniciar sesión/i, input: 'input[name="email"]' },
  { name: 'register', path: '/register', marker: /Registrarse|Crear cuenta/i, input: 'input[name="name"]' },
  { name: 'publish', path: '/publish', marker: /Inicia sesión para continuar/i, input: 'input[name="email"]' },
  { name: 'my-ads', path: '/account/listings', marker: /Inicia sesión para continuar/i, input: 'input[name="email"]' },
  { name: 'admin-login', path: '/admin/login', marker: /Inicia sesión para continuar/i, input: 'input[name="email"]' },
];

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const viewport of viewports) {
  for (const screen of screens) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      locale: 'es-MX',
      colorScheme: 'light',
    });
    await context.addInitScript(() => {
      localStorage.setItem('lang', 'es');
      localStorage.setItem('mercasto_language', 'es');
      localStorage.setItem('cookie_consent', 'essential');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    });

    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const sameOriginFailures = [];
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', error => pageErrors.push(String(error)));
    page.on('requestfailed', request => {
      if (request.url().startsWith(baseUrl)) {
        sameOriginFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'failed'}`);
      }
    });

    const response = await page.goto(new URL(screen.path, baseUrl).toString(), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForTimeout(1800);
    if (screen.input) await page.locator(screen.input).waitFor({ state: 'visible', timeout: 10_000 });
    try {
      await page.waitForFunction(
        ({ source, flags }) => new RegExp(source, flags).test(document.body.innerText),
        { source: screen.marker.source, flags: screen.marker.flags },
        { timeout: 10_000 },
      );
    } catch (error) {
      const sample = await page.locator('body').innerText().catch(() => '');
      console.error(JSON.stringify({ viewport: viewport.name, screen: screen.name, marker: screen.marker.source, sample: sample.replace(/\s+/g, ' ').slice(0, 500) }));
      throw error;
    }

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
        bodyTextSample: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 280),
      };
    });

    const imageName = `${viewport.name}-${screen.name}.jpg`;
    await page.screenshot({ path: path.join(outputRoot, imageName), type: 'jpeg', quality: 72 });
    results.push({
      viewport: viewport.name,
      width: viewport.width,
      height: viewport.height,
      screen: screen.name,
      requestedPath: screen.path,
      finalUrl: page.url(),
      status: response?.status() ?? null,
      screenshot: imageName,
      ...metrics,
      consoleErrors,
      pageErrors,
      sameOriginFailures,
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
  || result.sameOriginFailures.length > 0
));

const report = {
  generatedAt: new Date().toISOString(),
  productionCommit: commit,
  baseUrl,
  evidenceState: 'anonymous production browser state; protected routes display the authentication gate',
  totalScreenshots: results.length,
  failures: failures.length,
  results,
};
await writeFile(path.join(outputRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

const lines = [
  '# Mercasto production UI visual QA evidence',
  '',
  `- Generated: ${report.generatedAt}`,
  `- Production commit: \`${commit}\``,
  `- Base URL: ${baseUrl}`,
  `- Screenshots: ${results.length}`,
  `- Automated failures: ${failures.length}`,
  '- State: anonymous production browser; protected pages show the login gate without mutating production data.',
  '',
  '| Viewport | Screen | Final URL | HTTP | Overflow | Broken images | Page errors | Screenshot |',
  '|---|---|---|---:|---:|---:|---:|---|',
  ...results.map(result => `| ${result.viewport} ${result.width}×${result.height} | ${result.screen} | \`${result.finalUrl}\` | ${result.status} | ${result.overflowPx}px | ${result.brokenImages.length} | ${result.pageErrors.length} | [view](./${result.screenshot}) |`),
  '',
  '## Notes',
  '',
  '- Login and registration are captured with their real production forms open.',
  '- Publish, My Ads, and Admin login are captured in the anonymous authentication-gate state.',
  '- Full authenticated publish/dashboard content still requires separate credentialed visual evidence.',
];
await writeFile(path.join(outputRoot, 'README.md'), `${lines.join('\n')}\n`);

console.log(JSON.stringify({ outputRoot, screenshots: results.length, failures: failures.length }, null, 2));
if (failures.length > 0) process.exitCode = 1;
