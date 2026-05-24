#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
REQUIRE_LEGAL_READY="${REQUIRE_LEGAL_READY:-0}"

PUBLIC_LEGAL_PATHS=(
  "/terminos"
  "/privacidad"
  "/cookies"
  "/contacto"
  "/ayuda"
  "/safety"
)

# These routes represent the remaining P0 legal/business gaps.
# They are required only when REQUIRE_LEGAL_READY=1, so the script can be used
# both as a non-blocking inventory and as a strict launch gate.
STRICT_LEGAL_PATHS=(
  "/reembolsos"
  "/moderacion"
)

probe_status() {
  local path="$1"
  local expected="${2:-200}"
  local url="${BASE_URL}${path}"
  local code
  code="$(curl -k -sS -o /dev/null -w '%{http_code}' --max-time 20 "$url" || true)"
  if [ -z "$code" ]; then code="000"; fi
  printf '%s -> %s\n' "$url" "$code"
  [ "$code" = "$expected" ]
}

echo "== Mercasto legal/business readiness smoke =="
echo "BASE_URL=$BASE_URL"
echo "REQUIRE_LEGAL_READY=$REQUIRE_LEGAL_READY"

for path in "${PUBLIC_LEGAL_PATHS[@]}"; do
  probe_status "$path"
done

if [ "$REQUIRE_LEGAL_READY" = "1" ]; then
  echo "== Strict legal launch routes =="
  for path in "${STRICT_LEGAL_PATHS[@]}"; do
    probe_status "$path"
  done
else
  echo "== Strict legal launch routes are pending inventory only =="
  for path in "${STRICT_LEGAL_PATHS[@]}"; do
    probe_status "$path" || true
  done
  echo "Set REQUIRE_LEGAL_READY=1 to make refund/payment and moderation policy routes blocking."
fi

echo "legal/business readiness smoke OK"
