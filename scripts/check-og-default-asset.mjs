#!/usr/bin/env node
/**
 * Guards the default Open Graph card assets:
 *   public/og-default-1200x630.jpg  (preferred og:image)
 *   public/og-default-1200x630.png  (lossless fallback, same artwork)
 *
 * Why this exists: these are committed binaries, so nothing in lint or build
 * would notice if one were replaced by a wrong-sized export - the exact defect
 * this card was created to fix (a 512x512 icon served as a 1.905:1 preview).
 * Dimensions are read straight out of the file headers, no image library.
 *
 * Usage: node scripts/check-og-default-asset.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SVG = join(ROOT, 'design', 'og', 'og-default-1200x630.svg');
const PNG = join(ROOT, 'public', 'og-default-1200x630.png');
const JPG = join(ROOT, 'public', 'og-default-1200x630.jpg');

// Cross-platform "large preview" requirement (see design/og/README.md).
const W = 1200;
const H = 630;
// Crawler fetch budget. This card is fetched on every share unfurl, so it must
// stay cheap; 200 KB is comfortably under every platform's limit (<5 MB) and
// under the asset it replaces.
const MAX_BYTES = 200 * 1024;
const MIN_BYTES = 5 * 1024; // catches a blank or truncated export

const failures = [];
const fail = (m) => failures.push(m);

function readPng(file) {
  const b = readFileSync(file);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!b.subarray(0, 8).equals(sig)) { fail(`${file}: not a PNG`); return null; }
  // IHDR width/height: big-endian uint32 at offsets 16 and 20.
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), bitDepth: b[24], colorType: b[25], bytes: b.length };
}

function readJpeg(file) {
  const b = readFileSync(file);
  if (b[0] !== 0xff || b[1] !== 0xd8) { fail(`${file}: not a JPEG`); return null; }
  // Walk the marker segments to the Start-Of-Frame, which carries the size.
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i++; continue; }
    const marker = b[i + 1];
    // SOF0..SOF15 except DHT(c4), JPG(c8) and DAC(cc) carry frame dimensions.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7), bytes: b.length };
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) { i += 2; continue; }
    i += 2 + b.readUInt16BE(i + 2);
  }
  fail(`${file}: no JPEG frame header found`);
  return null;
}

function check(name, info, { requireOpaque }) {
  if (!info) return;
  if (info.w !== W || info.h !== H) fail(`${name}: wrong dimensions ${info.w}x${info.h}, expected ${W}x${H}`);
  if (info.bytes > MAX_BYTES) fail(`${name}: too large ${info.bytes} bytes > ${MAX_BYTES}`);
  if (info.bytes < MIN_BYTES) fail(`${name}: suspiciously small ${info.bytes} bytes < ${MIN_BYTES}`);
  if (requireOpaque) {
    // colorType 2 = truecolour RGB, no alpha. A transparent card is unsafe:
    // feeds composite onto unknown backgrounds.
    if (info.colorType !== 2) fail(`${name}: expected opaque RGB (colorType 2), got colorType ${info.colorType}`);
    if (info.bitDepth !== 8) fail(`${name}: unexpected bit depth ${info.bitDepth}, expected 8`);
  }
  console.log(`  ${name}: ${info.w}x${info.h} ${info.bytes} bytes`);
}

let png = null;
let jpg = null;
try { png = readPng(PNG); } catch { fail(`missing ${PNG} - run: node scripts/rasterize-og-default.mjs`); }
try { jpg = readJpeg(JPG); } catch { fail(`missing ${JPG} - run: node scripts/rasterize-og-default.mjs`); }

console.log('og-default card:');
check('png', png, { requireOpaque: true });
check('jpg', jpg, { requireOpaque: false });

// Both formats must be the same artwork at the same canvas size.
if (png && jpg && (png.w !== jpg.w || png.h !== jpg.h)) {
  fail(`png and jpg disagree on size: ${png.w}x${png.h} vs ${jpg.w}x${jpg.h}`);
}

// The SVG is the source of truth; keep its canvas in sync with the assets.
let svg = '';
try {
  svg = readFileSync(SVG, 'utf8');
} catch {
  fail(`missing SVG source of truth: ${SVG}`);
}
if (svg) {
  if (!svg.includes(`width="${W}"`) || !svg.includes(`height="${H}"`)) fail(`SVG canvas is not ${W}x${H}`);
  if (!svg.includes(`viewBox="0 0 ${W} ${H}"`)) fail(`SVG viewBox is not "0 0 ${W} ${H}"`);
}

if (failures.length) {
  console.error('\nFAIL: og-default card');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\nog-default card OK (budget ${MAX_BYTES} bytes each)`);
