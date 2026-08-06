#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="$ROOT_DIR/docs/route-inventory.md"
GENERATED="$ROOT_DIR/docs/route-inventory-generated.md"

[[ -s "$DOC" ]] || { echo "missing curated route inventory" >&2; exit 1; }
[[ -s "$GENERATED" ]] || { echo "missing generated route inventory" >&2; exit 1; }

if grep -Eq '\bTBD\b|Fill from route:list|Pending generation' "$DOC"; then
  echo "curated route inventory still contains placeholders" >&2
  exit 1
fi

for section in \
  'Runtime routing model' \
  'Authentication and account lifecycle' \
  'Listing publish and seller lifecycle' \
  'Upload and identity surfaces' \
  'Search, discovery and contact' \
  'Payments, renewals and promotions' \
  'Admin and moderation boundary'; do
  grep -qF "## $section" "$DOC" || { echo "missing route inventory section: $section" >&2; exit 1; }
done

for contract in \
  '/api/register' \
  '/api/login' \
  '/api/logout' \
  '/api/ads' \
  '/api/ads/{id}/renew' \
  '/api/user/avatar' \
  '/api/search/semantic' \
  '/api/payment/clip' \
  '/api/webhooks/clip/ad-renewal' \
  'auth:sanctum' \
  'State-changing'; do
  grep -qF "$contract" "$DOC" || { echo "missing route contract: $contract" >&2; exit 1; }
done

if grep -Eq 'generated::[[:alnum:]_]{8,}' "$GENERATED"; then
  echo "generated route inventory contains unstable Laravel route names" >&2
  exit 1
fi

grep -qF 'generated::<auto>' "$GENERATED" || {
  echo "generated route inventory normalization marker is missing" >&2
  exit 1
}

echo "route inventory document gate OK"
