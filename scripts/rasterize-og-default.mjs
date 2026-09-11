#!/usr/bin/env node
/**
 * Rasterises design/og/og-default-1200x630.svg into the committed OG assets:
 *
 *   public/og-default-1200x630.jpg   (preferred for og:image - see README)
 *   public/og-default-1200x630.png   (same artwork, lossless fallback)
 *
 * Backends, in order of preference:
 *   1. rsvg-convert (librsvg) - fast, no browser. Rasterises PNG, and encodes
 *      the JPEG itself when linked against libjpeg.
 *   2. Playwright Chromium - already a devDependency of this repo, so this
 *      works on a clean checkout with no extra install.
 *
 * Rasterisation is deterministic for a given backend: re-running reproduces a
 * byte-identical PNG (verified with rsvg-convert 2.58.0).
 *
 * Usage: node scripts/rasterize-og-default.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SVG = join(ROOT, 'design', 'og', 'og-default-1200x630.svg');
const PNG = join(ROOT, 'public', 'og-default-1200x630.png');
const JPG = join(ROOT, 'public', 'og-default-1200x630.jpg');
const W = 1200;
const H = 630;

// Single source of truth for JPEG quality. Keep in sync with README; the
// checker script asserts the resulting size stays within budget.
export const JPEG_QUALITY = 88;

if (!existsSync(SVG)) {
  console.error(`FAIL: missing SVG source of truth ${SVG}`);
  process.exit(1);
}

const have = (cmd) => {
  try {
    execFileSync('sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

async function viaPlaywright() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await page.goto('file://' + SVG, { waitUntil: 'load' });
    const clip = { x: 0, y: 0, width: W, height: H };
    // omitBackground:false keeps the card opaque, which feeds require.
    writeFileSync(PNG, await page.screenshot({ type: 'png', omitBackground: false, clip }));
    writeFileSync(JPG, await page.screenshot({ type: 'jpeg', quality: JPEG_QUALITY, clip }));
  } finally {
    await browser.close();
  }
}

let backend;
if (have('rsvg-convert')) {
  execFileSync('rsvg-convert', ['-w', String(W), '-h', String(H), '--format=png', '--output=' + PNG, SVG], { stdio: 'inherit' });
  // librsvg usually ships without a JPEG encoder, so do not even attempt it:
  // derive the JPEG from the PNG so both assets always show identical artwork.
  try {
    if (!have('python3')) throw new Error('no python3');
    execFileSync('python3', ['-c', [
        'from PIL import Image; import sys',
        `Image.open(${JSON.stringify(PNG)}).convert("RGB").save(${JSON.stringify(JPG)}, "JPEG", quality=${JPEG_QUALITY}, optimize=True, progressive=True)`,
    ].join('\n')], { stdio: 'inherit' });
  } catch {
    try { unlinkSync(JPG); } catch {}
    console.error('WARN: could not encode JPEG (need python3 + PIL). PNG written; og:image can use the PNG.');
  }
  backend = 'rsvg-convert';
} else {
  try {
    await viaPlaywright();
    backend = 'playwright-chromium';
  } catch (err) {
    console.error('FAIL: no rasteriser available.');
    console.error('Install librsvg (rsvg-convert), or run `npm ci` so Playwright is present.');
    console.error(String(err && err.message ? err.message : err));
    process.exit(1);
  }
}

console.log(`rasterised via ${backend}`);
for (const f of [PNG, JPG]) {
  if (!existsSync(f)) continue;
  const b = readFileSync(f);
  console.log(`  ${f.replace(ROOT + '/', '')}: ${b.length} bytes`);
}
console.log('  verify with: node scripts/check-og-default-asset.mjs');
