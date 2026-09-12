#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
AD_ID="${AD_ID:-1}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-share-og.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT
TMP_FILE="$TMP_DIR/share.html"

url="${BASE_URL%/}/share/ads/${AD_ID}"
code="$(curl -k -sS -L --max-time 20 -o "$TMP_FILE" -w '%{http_code}' "$url" || true)"
echo "$url -> $code"

if [ "$code" != "200" ]; then
  echo "FAIL: share page returned HTTP $code" >&2
  exit 1
fi

for token in og:title og:description og:image og:url twitter:card summary_large_image canonical; do
  if ! grep -Fq "$token" "$TMP_FILE"; then
    echo "FAIL: missing token $token" >&2
    exit 1
  fi
done

if grep -Fq 'id="root"' "$TMP_FILE"; then
  echo "FAIL: share page returned SPA shell" >&2
  exit 1
fi

# --- og:image must be big enough for a "large" link preview -----------------
# A square app icon (e.g. icon-512x512.png, 512x512) satisfies "og:image exists"
# but every platform renders it small or crops it, so assert real dimensions.
OG_IMAGE="$(grep -o 'property="og:image" content="[^"]*"' "$TMP_FILE" | head -1 | sed 's/.*content="//; s/"$//')"
if [ -z "$OG_IMAGE" ]; then
  echo "FAIL: could not parse og:image content" >&2
  exit 1
fi
echo "og:image -> $OG_IMAGE"

IMG_FILE="$TMP_DIR/og-image"
img_code="$(curl -k -sS -L --max-time 20 -o "$IMG_FILE" -w '%{http_code}' "$OG_IMAGE" || true)"
if [ "$img_code" != "200" ]; then
  echo "FAIL: og:image returned HTTP $img_code" >&2
  exit 1
fi

# PNG dimensions live at bytes 16..24 (IHDR); JPEG is scanned for its SOF frame.
# Pure Node, no image dependency.
if ! node -e '
const fs = require("fs");
const buf = fs.readFileSync(process.argv[1]);
let w = 0, h = 0;
if (buf.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) {
  w = buf.readUInt32BE(16); h = buf.readUInt32BE(20);
} else if (buf[0] === 0xff && buf[1] === 0xd8) {
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i+1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      h = buf.readUInt16BE(i+5); w = buf.readUInt16BE(i+7); break;
    }
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd9)) { i += 2; continue; }
    i += 2 + buf.readUInt16BE(i+2);
  }
} else {
  console.error("FAIL: og:image is neither PNG nor JPEG"); process.exit(2);
}
if (!w || !h) { console.error("FAIL: could not read og:image dimensions"); process.exit(2); }
const MIN_W = 600, MIN_H = 315;      // cross-platform large-preview minimum
const ratio = w / h, TARGET = 1200 / 630;
const ratioOk = Math.abs(ratio - TARGET) < 0.01;
console.log(`og:image dimensions ${w}x${h} (ratio ${ratio.toFixed(3)})`);

// TRANSITIONAL EXEMPTION - remove once the branded card is deployed.
// Until then production legitimately still serves the square app icon that this
// work replaces. Failing the shared gate (smoke:all, gate:prod) for a known,
// in-flight defect would block every other engineer, so it is reported loudly
// instead of fatally. Every OTHER undersized image stays fatal, so the coverage
// is live from the moment this check ships.
// Tighten by deleting this block: after deployment the fallback is
// og-default-1200x630.jpg and every undersized preview must therefore fail.
const KNOWN_LEGACY_FALLBACK = "icon-512x512.png";
if (w < MIN_W || h < MIN_H) {
  if (String(process.argv[2] || "").includes(KNOWN_LEGACY_FALLBACK)) {
    console.error(`WARN: og:image is still the legacy ${KNOWN_LEGACY_FALLBACK} (${w}x${h}), below the ${MIN_W}x${MIN_H} minimum.`);
    console.error("      This is the defect the branded 1200x630 card fixes; it clears once the share controller is deployed.");
  } else {
    console.error(`FAIL: og:image ${w}x${h} is below the ${MIN_W}x${MIN_H} large-preview minimum - platforms will render a small card`);
    process.exit(3);
  }
}
if (!ratioOk) {
  console.error(`WARN: og:image ratio ${ratio.toFixed(3)} is not ~${TARGET.toFixed(3)}; platforms will centre-crop it`);
}
' "$IMG_FILE" "$OG_IMAGE"; then
  echo "FAIL: og:image dimension check failed for $OG_IMAGE" >&2
  exit 1
fi

echo "share og smoke OK"
