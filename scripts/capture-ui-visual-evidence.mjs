import { chromium, devices, webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  backendStaticScreens,
  clientOnlyScreens,
  redirectExpectations,
  supportedDynamicTemplates,
} from './public-ui-route-policy.mjs';
import {
  protectedClientScreens,
  publicClientScreens,
  staticClientRedirects,
} from './client-spa-route-policy.mjs';

const baseUrl = process.env.BASE_URL || 'https://mercasto.com';
const sourceCommit = process.env.EVIDENCE_SOURCE_COMMIT || process.env.GITHUB_SHA || 'unknown';
const evidenceDate = process.env.EVIDENCE_DATE || new Date().toISOString().slice(0, 10);
const outputRoot = process.env.EVIDENCE_OUTPUT
  || path.join('docs', 'evidence', 'ui-visual-qa', `${evidenceDate}-${sourceCommit.slice(0, 8)}`);

const layoutViewports = [
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

const representativeMobile = layoutViewports.find(viewport => viewport.name === 'mobile-390');
const representativeDesktop = layoutViewports.find(viewport => viewport.name === 'desktop-1440');

const profiles = [
  {
    name: 'chromium-layout',
    browserType: chromium,
    viewports: layoutViewports,
    context: {},
  },
  {
    name: 'chromium-pixel7',
    browserType: chromium,
    viewports: [representativeMobile],
    context: { ...devices['Pixel 7'] },
  },
  {
    name: 'webkit-desktop-safari',
    browserType: webkit,
    viewports: [representativeDesktop],
    context: { ...devices['Desktop Safari'] },
  },
  {
    name: 'webkit-iphone13',
    browserType: webkit,
    viewports: [representativeMobile],
    context: { ...devices['iPhone 13'] },
  },
];

function envSet(name) {
  const raw = process.env[name]?.trim();
  return raw ? new Set(raw.split(',').map(value => value.trim()).filter(Boolean)) : null;
}

const requestedProfiles = envSet('EVIDENCE_PROFILE_NAMES');
const requestedViewports = envSet('EVIDENCE_VIEWPORT_NAMES');
const activeProfiles = profiles
  .filter(profile => !requestedProfiles || requestedProfiles.has(profile.name))
  .map(profile => ({
    ...profile,
    viewports: profile.viewports.filter(viewport => !requestedViewports || requestedViewports.has(viewport.name)),
  }))
  .filter(profile => profile.viewports.length > 0);

async function resolveSampleAd() {
  try {
    const response = await fetch(new URL('/api/ads?per_page=1', baseUrl), {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return { id: null, sellerId: null, error: `HTTP ${response.status}` };
    }
    const payload = await response.json();
    const rows = Array.isArray(payload?.data) ? payload.data : payload?.data?.data;
    const id = Number(rows?.[0]?.id);
    const sellerId = Number(rows?.[0]?.user_id ?? rows?.[0]?.user?.id);
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(sellerId) || sellerId <= 0) {
      return { id: null, sellerId: null, error: 'No active public ad/seller sample returned.' };
    }
    return { id, sellerId, error: null };
  } catch (error) {
    return { id: null, sellerId: null, error: String(error) };
  }
}

async function verifyClientRedirects(sampleAd) {
  if (!sampleAd.id) {
    return [{ sourcePath: 'dynamic-client-redirects', expectedTarget: 'sample ad required', actualTarget: null, status: null, error: sampleAd.error, passed: false }];
  }

  const referralCode = 'QA-ROUTE-COVERAGE';
  const checksToRun = [
    ...Object.entries(staticClientRedirects).map(([sourcePath, expectation]) => ({ sourcePath, ...expectation })),
    { sourcePath: `/account/listing/${sampleAd.id}/edit`, expectedPath: `/anuncio/${sampleAd.id}/editar` },
    { sourcePath: `/account/listing/${sampleAd.id}/photos`, expectedPath: `/anuncio/${sampleAd.id}/editar`, expectedSearch: '?section=photos' },
    { sourcePath: `/r/${referralCode}`, expectedPath: '/', expectedStorage: { pendingReferral: referralCode } },
  ];

  const browser = await chromium.launch({ headless: true });
  const checks = [];
  try {
    for (const expectation of checksToRun) {
      const context = await browser.newContext({ ...devices['Desktop Chrome'], locale: 'es-MX' });
      await context.addInitScript(() => {
        localStorage.setItem('lang', 'es');
        localStorage.setItem('mercasto_language', 'es');
        localStorage.setItem('cookie_consent', 'essential');
        localStorage.setItem('cookiesAccepted', 'true');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('pendingReferral');
      });
      const page = await context.newPage();
      try {
        const response = await page.goto(new URL(expectation.sourcePath, baseUrl).toString(), {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });
        await page.waitForTimeout(1200);
        const finalUrl = new URL(page.url());
        const actualPath = finalUrl.pathname.replace(/\/$/, '') || '/';
        const expectedSearch = expectation.expectedSearch || '';
        const storage = expectation.expectedStorage
          ? await page.evaluate(() => ({ pendingReferral: localStorage.getItem('pendingReferral') }))
          : null;
        const storagePassed = !expectation.expectedStorage
          || Object.entries(expectation.expectedStorage).every(([key, value]) => storage?.[key] === value);
        checks.push({
          sourcePath: expectation.sourcePath,
          expectedTarget: expectation.expectedPath,
          expectedSearch,
          actualTarget: actualPath,
          actualSearch: finalUrl.search,
          status: response?.status() ?? null,
          error: null,
          passed: actualPath === expectation.expectedPath
            && (!expectation.expectedSearch || finalUrl.search === expectation.expectedSearch)
            && storagePassed,
        });
      } catch (error) {
        checks.push({
          sourcePath: expectation.sourcePath,
          expectedTarget: expectation.expectedPath,
          expectedSearch: expectation.expectedSearch || '',
          actualTarget: null,
          actualSearch: null,
          status: null,
          error: String(error),
          passed: false,
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  return checks;
}

async function verifyRedirects() {
  const checks = [];
  for (const [sourcePath, targetPath] of Object.entries(redirectExpectations)) {
    try {
      const response = await fetch(new URL(sourcePath, baseUrl), { redirect: 'manual' });
      const location = response.headers.get('location');
      const actualTarget = location ? new URL(location, baseUrl).pathname.replace(/\/$/, '') || '/' : null;
      checks.push({
        sourcePath,
        expectedTarget: targetPath,
        actualTarget,
        status: response.status,
        error: null,
        passed: response.status === 301 && actualTarget === targetPath,
      });
    } catch (error) {
      checks.push({
        sourcePath,
        expectedTarget: targetPath,
        actualTarget: null,
        status: null,
        error: String(error),
        passed: false,
      });
    }
  }
  return checks;
}

const sampleAd = await resolveSampleAd();
const backendDynamicScreens = sampleAd.id
  ? supportedDynamicTemplates.map(template => {
      const path = `/${template.replace('{id}', String(sampleAd.id))}`;
      const shareRoute = template.startsWith('share/');
      return {
        name: shareRoute ? 'share-ad-sample' : 'ad-detail-sample',
        path,
        expectedPath: shareRoute ? `/ads/${sampleAd.id}` : path,
      };
    })
  : [];
const clientDynamicVisualScreens = sampleAd.id && sampleAd.sellerId
  ? [
      { name: 'ad-alias-sample', path: `/anuncio/${sampleAd.id}` },
      { name: 'seller-profile-sample', path: `/vendedor/${sampleAd.sellerId}` },
      { name: 'ad-edit-auth-gate', path: `/anuncio/${sampleAd.id}/editar`, selector: 'input[name="email"]' },
    ]
  : [];
const notFoundScreen = { name: 'not-found-sample', path: '/__qa_route_not_found__', expectNotFound: true };
const requestedScreens = envSet('EVIDENCE_SCREEN_NAMES');
const allScreens = [
  ...backendStaticScreens,
  ...clientOnlyScreens,
  ...protectedClientScreens,
  ...publicClientScreens,
  ...backendDynamicScreens,
  ...clientDynamicVisualScreens,
  notFoundScreen,
];
const screens = allScreens.filter(screen => !requestedScreens || requestedScreens.has(screen.name));
const redirectChecks = await verifyRedirects();
const clientRedirectChecks = await verifyClientRedirects(sampleAd);


function expectedPathname(screen) {
  const expected = screen.expectedPath || screen.path;
  return new URL(expected, baseUrl).pathname.replace(/\/$/, '') || '/';
}

await mkdir(outputRoot, { recursive: true });
const results = [];

for (const profile of activeProfiles) {
  const browser = await profile.browserType.launch({ headless: true });
  try {
    for (const viewport of profile.viewports) {
      for (const screen of screens) {
        const context = await browser.newContext({
          ...profile.context,
          viewport: { width: viewport.width, height: viewport.height },
          locale: 'es-MX',
          colorScheme: 'light',
        });
        await context.addInitScript(() => {
          localStorage.setItem('lang', 'es');
          localStorage.setItem('mercasto_language', 'es');
          localStorage.setItem('cookie_consent', 'essential');
          localStorage.setItem('cookiesAccepted', 'true');
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
        await page.locator('body').waitFor({ state: 'visible', timeout: 15_000 });
        if (screen.selector) {
          await page.locator(screen.selector).first().waitFor({ state: 'visible', timeout: 15_000 });
        } else {
          await page.waitForTimeout(900);
        }

        const finalUrl = new URL(page.url());
        const expectedPath = expectedPathname(screen);
        const actualPath = finalUrl.pathname.replace(/\/$/, '') || '/';
        const expectedSearch = screen.expectedSearch || '';
        const metrics = await page.evaluate(() => {
          const images = [...document.images];
          const bodyText = document.body.innerText.replace(/\s+/g, ' ').trim();
          return {
            title: document.title,
            language: document.documentElement.lang,
            direction: document.documentElement.dir || 'ltr',
            overflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
            brokenImages: images.filter(image => image.complete && image.naturalWidth === 0).map(image => image.currentSrc || image.src),
            emptyHrefs: [...document.querySelectorAll('a')]
              .filter(anchor => !anchor.getAttribute('href')?.trim())
              .map(anchor => anchor.textContent?.trim() || anchor.outerHTML.slice(0, 120)),
            bodyHas404: /Error 404|No encontrado|Not found/i.test(bodyText),
            mainLandmarks: document.querySelectorAll('main').length,
            bodyTextLength: bodyText.length,
            bodyTextSample: bodyText.slice(0, 280),
            scrollHeight: document.documentElement.scrollHeight,
          };
        });

        const deviceScaleFactor = Number(profile.context.deviceScaleFactor || 1);
        const maxSafeCssHeight = Math.floor(30000 / deviceScaleFactor);
        const fullPageScreenshot = metrics.scrollHeight <= maxSafeCssHeight;
        const safeProfile = profile.name.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
        const imageName = `${safeProfile}-${viewport.name}-${screen.name}.jpg`;
        await page.screenshot({
          path: path.join(outputRoot, imageName),
          type: 'jpeg',
          quality: 72,
          fullPage: fullPageScreenshot,
        });
        results.push({
          browserProfile: profile.name,
          viewport: viewport.name,
          width: viewport.width,
          height: viewport.height,
          screen: screen.name,
          requestedPath: screen.path,
          expectedPath,
          actualPath,
          expectedSearch,
          actualSearch: finalUrl.search,
          expectNotFound: Boolean(screen.expectNotFound),
          finalUrl: page.url(),
          status: response?.status() ?? null,
          screenshot: imageName,
          screenshotMode: fullPageScreenshot ? 'full-page' : 'viewport-capped',
          deviceScaleFactor,
          ...metrics,
          consoleErrors,
          pageErrors,
          sameOriginFailures,
        });
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

const visualFailures = results.filter(result => (
  (result.status !== null && result.status >= 400)
  || result.actualPath !== result.expectedPath
  || (result.expectedSearch && result.actualSearch !== result.expectedSearch)
  || result.overflowPx > 1
  || result.brokenImages.length > 0
  || (result.bodyHas404 && !result.expectNotFound)
  || (!result.bodyHas404 && result.expectNotFound)
  || result.bodyTextLength < 20
  || result.pageErrors.length > 0
  || result.sameOriginFailures.length > 0
));
const redirectFailures = redirectChecks.filter(check => !check.passed);
const clientRedirectFailures = clientRedirectChecks.filter(check => !check.passed);
const dynamicCoverageFailure = (
  backendDynamicScreens.length === supportedDynamicTemplates.length
  && clientDynamicVisualScreens.length === 3
) ? 0 : 1;
const failures = visualFailures.length + redirectFailures.length + clientRedirectFailures.length + dynamicCoverageFailure;

const report = {
  generatedAt: new Date().toISOString(),
  sourceCommit,
  baseUrl,
  evidenceState: 'anonymous production browser state; protected canonical routes display the authentication gate',
  activeLocale: 'es',
  browserProfiles: activeProfiles.map(profile => profile.name),
  routeCoverage: {
    availableVisualScreens: allScreens.length,
    selectedVisualScreens: screens.length,
    backendStaticScreens: backendStaticScreens.length,
    clientOnlyScreens: clientOnlyScreens.length,
    protectedClientScreens: protectedClientScreens.length,
    publicClientScreens: publicClientScreens.length,
    backendDynamicScreens: backendDynamicScreens.length,
    clientDynamicVisualScreens: clientDynamicVisualScreens.length,
    expectedBackendDynamicScreens: supportedDynamicTemplates.length,
    sampleAdId: sampleAd.id,
    sampleSellerId: sampleAd.sellerId,
    sampleAdResolutionError: sampleAd.error,
    backendRedirects: redirectChecks.length,
    clientRedirects: clientRedirectChecks.length,
  },
  totalScreenshots: results.length,
  failures,
  redirectChecks,
  clientRedirectChecks,
  results,
};
await writeFile(path.join(outputRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

const lines = [
  '# Mercasto production UI visual QA evidence',
  '',
  `- Generated: ${report.generatedAt}`,
  `- Evidence source commit: \`${sourceCommit}\``,
  `- Base URL: ${baseUrl}`,
  `- Browser profiles: ${report.browserProfiles.join(', ')}`,
  `- Screenshots: ${results.length}`,
  `- Automated failures: ${failures}`,
  `- Static backend browser surfaces: ${backendStaticScreens.length}`,
  `- Backend dynamic listing/share samples: ${backendDynamicScreens.length}`,
  `- Client dynamic visual samples: ${clientDynamicVisualScreens.length}`,
  `- Backend redirect checks: ${redirectChecks.length}`,
  `- Client redirect checks: ${clientRedirectChecks.length}`,
  '- State: anonymous production browser; protected canonical routes show the login gate without mutating production data.',
  '- Scope: full required layout widths in Chromium plus representative Pixel 7 Chromium, Desktop Safari/WebKit and iPhone WebKit.',
  '- Real physical iPhone sign-off remains separate; WebKit emulation is not real-device evidence.',
  '',
  '| Browser | Viewport | Screen | Final path | HTTP | Main landmarks | Overflow | Broken images | Page errors | Capture | Screenshot |',
  '|---|---|---|---|---:|---:|---:|---:|---:|---|---|',
  ...results.map(result => `| ${result.browserProfile} | ${result.viewport} ${result.width}×${result.height} | ${result.screen} | \`${result.actualPath}\` | ${result.status} | ${result.mainLandmarks} | ${result.overflowPx}px | ${result.brokenImages.length} | ${result.pageErrors.length} | ${result.screenshotMode} | [view](./${result.screenshot}) |`),
  '',
  '## Notes',
  '',
  '- Static backend browser routes come directly from the committed semantic Laravel route inventory; new static routes enter the evidence matrix automatically.',
  '- Backend 301 redirect routes are verified separately against explicit target expectations.',
  '- Dynamic ad/share, ad alias/edit and seller-profile routes use one current read-only public ad/seller sample.',
  '- Client-side acquisition, legacy account and referral redirects are verified separately in a single Chromium navigation pass.',
  '- The wildcard React route is captured with an intentional not-found sample and must render the localized 404 state.',
  '- Login and registration are captured with their production forms open.',
  '- Post, profile, and admin are captured in the anonymous authentication-gate state.',
  '- Authenticated seller/buyer/admin/Advertising Hub surfaces are covered by the separate isolated authenticated cabinet matrix.',
];
await writeFile(path.join(outputRoot, 'README.md'), `${lines.join('\n')}\n`);

console.log(JSON.stringify({
  outputRoot,
  screens: screens.length,
  screenshots: results.length,
  backendRedirects: redirectChecks.length,
  clientRedirects: clientRedirectChecks.length,
  failures,
}, null, 2));
if (failures > 0) process.exitCode = 1;
