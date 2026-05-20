#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
AD_ID="${AD_ID:-1}"
TMP_FILE="${TMPDIR:-/tmp}/mercasto-share-og-smoke.html"

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

echo "share og smoke OK"
