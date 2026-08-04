#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Smoke tempfile safety gate =="

files=(
  scripts/auth-providers-smoke.sh
  scripts/business-profile-smoke.sh
  scripts/cache-header-smoke.sh
  scripts/listing-route-smoke.sh
  scripts/security-probes.sh
  scripts/session-cookie-smoke.sh
  scripts/share-og-smoke.sh
)

for file in "${files[@]}"; do
  test -f "$file"
  grep -qF 'mktemp' "$file"
  grep -Eq "trap .*rm -r?f" "$file"
done

if grep -nE '/tmp/mercasto_(probe|listing_route)|\$\{TMPDIR:-/tmp\}/mercasto-(auth-providers|business-profile-(smoke|routes|migrate)|homepage-headers|cookie-headers|share-og-smoke)' "${files[@]}"; then
  echo "fixed shared temp path found in production smoke scripts" >&2
  exit 1
fi

echo "smoke tempfile safety gate OK"
