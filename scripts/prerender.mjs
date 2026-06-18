#!/usr/bin/env node
/**
 * Build-time prerender of the SPA's most important routes.
 *
 * Why: the homepage is client-rendered, so the LCP image (a Destacados card)
 * is not discoverable in the initial HTML and only paints after the JS bundle
 * loads + the API responds. PageSpeed mobile LCP stays ~6s because of this.
 *
 * This script serves the freshly built `dist/`, loads each route in headless
 * Chromium, lets the real content render (Destacados/Tendencias with their
 * images), then writes the fully-rendered HTML back to disk. The browser now
 * paints real content — including the LCP image — straight from HTML.
 *
 * IMPORTANT: this does NOT change runtime rendering. The app still mounts with
 * createRoot(), which replaces the prerendered markup on hydrate-less mount.
 * The prerendered HTML is purely an instant-paint snapshot; if it is ever
 * stale or wrong, the app simply re-renders the correct content client-side.
 * So the failure mode is "no improvement", never a broken page.
 *
 * Usage:
 *   npm run build:prerender
 * Env:
 *   PRERENDER_API_URL   API base the prerender browser should call
 *                       (default https://mercasto.com/api). Must be reachable
 *                       from the build machine so real ads render.
 *   PRERENDER_ROUTES    Comma-separated routes (default "/").
 *   PRERENDER_WAIT_MS   Max wait for content per route (default 12000).
 */

import http from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');
const API_URL = process.env.PRERENDER_API_URL || 'https://mercasto.com/api';
const ROUTES = (process.env.PRERENDER_ROUTES || '/').split(',').map(r => r.trim()).filter(Boolean);
const WAIT_MS = Number(process.env.PRERENDER_WAIT_MS || 12000);
const PORT = 4317;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        let filePath = path.join(DIST, urlPath);
        // SPA fallback: serve index.html for routes without a real file/extension
        if (!existsSync(filePath) || (await stat(filePath)).isDirectory()) {
          if (path.extname(urlPath)) { res.statusCode = 404; res.end('not found'); return; }
          filePath = path.join(DIST, 'index.html');
        }
        const body = await readFile(filePath);
        res.setHeader('Content-Type', MIME[path.extname(filePath)] || 'application/octet-stream');
        res.end(body);
      } catch (e) {
        res.statusCode = 500; res.end(String(e));
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function run() {
  if (!existsSync(path.join(DIST, 'index.html'))) {
    console.error('[prerender] dist/index.html not found — run `vite build` first.');
    process.exit(1);
  }

  // Playwright ships with the project's e2e tooling; reuse its Chromium.
  const { chromium } = await import('@playwright/test');

  const server = await startStaticServer();
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  console.log(`[prerender] API target: ${API_URL}`);

  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1024 } });
    // Point the SPA at a reachable API so real Destacados/Tendencias render.
    await page.addInitScript((api) => { window.__API_URL__ = api; }, API_URL);
    const url = `http://localhost:${PORT}${route}`;
    console.log(`[prerender] rendering ${route} ...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: WAIT_MS });
      // Wait for at least one real ad image to be present (the LCP candidate).
      await page.waitForSelector('img[src*="http"]', { timeout: 4000 }).catch(() => {});
      // Mark the prerendered output so the runtime / debugging can detect it.
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-prerendered', '1');
      });
      let html = await page.content();
      html = '<!doctype html>\n' + html.replace(/^<!doctype html>\s*/i, '');

      const outDir = route === '/' ? DIST : path.join(DIST, route);
      if (route !== '/') await mkdir(outDir, { recursive: true });
      await writeFile(path.join(outDir, 'index.html'), html, 'utf8');
      console.log(`[prerender] wrote ${path.relative(DIST, path.join(outDir, 'index.html'))} (${html.length} bytes)`);
    } catch (e) {
      console.error(`[prerender] FAILED for ${route}: ${e.message} — keeping original index.html`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  server.close();
  console.log('[prerender] done.');
}

run().catch((e) => { console.error(e); process.exit(1); });
