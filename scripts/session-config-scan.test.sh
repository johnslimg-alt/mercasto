#!/usr/bin/env bash
# Negative controls for scripts/session-config-scan.sh.
#
# The gate it replaces only asserted that the literal `'secure' =>` appears in
# backend/config/session.php, so it stayed green when the binding lost its
# production-safe default. These fixtures prove the hardened gate fails on that
# defect (and on a production env source that disables Secure), and passes on the
# real tree.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-session-scan.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$TMP_DIR/scripts" "$TMP_DIR/backend/config" "$TMP_DIR/.github/workflows"
cp "$ROOT_DIR/scripts/session-config-scan.sh" "$TMP_DIR/scripts/"

write_session_config() {
  local secure_binding="$1"
  cat > "$TMP_DIR/backend/config/session.php" <<PHP
<?php
return [
    'driver' => env('SESSION_DRIVER', 'database'),
    'lifetime' => (int) env('SESSION_LIFETIME', 120),
    'domain' => env('SESSION_DOMAIN'),
    $secure_binding
    'http_only' => env('SESSION_HTTP_ONLY', true),
    'same_site' => env('SESSION_SAME_SITE', 'lax'),
];
PHP
}

write_prod_env() {
  cat > "$TMP_DIR/backend/.env.production.example" <<ENV
APP_ENV=production
SESSION_SECURE_COOKIE=$1
ENV
}

cat > "$TMP_DIR/.github/workflows/production-live-gates.yml" <<'YAML'
jobs:
  production-session-security:
    steps:
      - run: bash scripts/production-session-security-smoke.sh
YAML

: > "$TMP_DIR/scripts/production-session-security-smoke.sh"

GOOD_BINDING="    'secure' => env('SESSION_SECURE_COOKIE', env('APP_ENV', 'production') === 'production'),"

run_gate() {
  set +e
  gate_output="$(bash "$TMP_DIR/scripts/session-config-scan.sh" 2>&1)"
  gate_status=$?
  set -e
}

expect_failure() {
  local label="$1" expected="$2"
  run_gate
  if (( gate_status == 0 )); then
    echo "session config scan accepted an insecure tree: $label" >&2
    echo "$gate_output" >&2
    exit 1
  fi
  if ! grep -qF "$expected" <<<"$gate_output"; then
    echo "session config scan failed for the wrong reason: $label" >&2
    echo "$gate_output" >&2
    exit 1
  fi
}

# 1. Production-safe default plus SESSION_SECURE_COOKIE=true passes.
write_session_config "$GOOD_BINDING"
write_prod_env true
run_gate
if (( gate_status != 0 )); then
  echo 'session config scan rejected the secure fixture' >&2
  echo "$gate_output" >&2
  exit 1
fi
grep -qF 'session config scan OK' <<<"$gate_output"

# 2. The defect this hardening exists for: no default, so an unset variable in
#    production resolves to null and the cookie loses the Secure attribute.
write_session_config "    'secure' => env('SESSION_SECURE_COOKIE'),"
expect_failure 'session.secure without a production-safe default' 'no production-safe default'

# 3. Secure bound to a hardcoded false instead of the environment variable.
write_session_config "    'secure' => false,"
expect_failure 'session.secure hardcoded false' 'not bound to SESSION_SECURE_COOKIE'

# 4. Secure bound to an unrelated environment variable.
write_session_config "    'secure' => env('SESSION_HTTPS_ONLY', true),"
expect_failure 'session.secure bound to the wrong variable' 'not bound to SESSION_SECURE_COOKIE'

# 5. Production template disables the Secure cookie.
write_session_config "$GOOD_BINDING"
write_prod_env false
expect_failure 'production template sets SESSION_SECURE_COOKIE=false' 'must set SESSION_SECURE_COOKIE=true'

# 6. A compose/CI environment source disables the Secure cookie.
write_prod_env true
cat > "$TMP_DIR/docker-compose.yml" <<'YAML'
services:
  backend:
    environment:
      SESSION_SECURE_COOKIE=false
YAML
expect_failure 'compose environment sets SESSION_SECURE_COOKIE=false' 'disables the Secure session cookie'
rm -f "$TMP_DIR/docker-compose.yml"

# 7. The live production runtime assertion is unwired from CI.
sed -i '/production-session-security-smoke.sh/d' "$TMP_DIR/.github/workflows/production-live-gates.yml"
expect_failure 'runtime session probe unwired' 'no longer run by CI'

echo 'session config scan regression test OK'
