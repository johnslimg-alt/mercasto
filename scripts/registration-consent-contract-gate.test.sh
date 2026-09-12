#!/usr/bin/env bash
# Negative controls for scripts/registration-consent-contract-gate.sh.
#
# The gate it replaces executed nothing: it grepped AuthController.php, legal.php
# and the frontend module and exited 0, so a payload that no longer carries the
# consent fields would still have passed. These fixtures keep every literal the
# old assertions looked for and break the actual contract, proving the executed
# tier is what catches the regression.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-consent-gate.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

FIXTURE_FILES=(
  backend/app/Http/Controllers/Api/AuthController.php
  backend/config/legal.php
  backend/app/Models/UserConsent.php
  backend/database/migrations/2026_08_03_220000_create_user_consents_table.php
  backend/tests/Feature/RegistrationConsentTest.php
  backend/tests/Feature/RegistrationConsentChannelsTest.php
  src/utils/registrationConsent.js
  src/utils/funnelAnalytics.js
  src/utils/trackingConsent.js
  src/App.jsx
  scripts/registration-consent-contract.mjs
  scripts/registration-consent-contract-gate.sh
)

for file in "${FIXTURE_FILES[@]}"; do
  mkdir -p "$TMP_DIR/$(dirname "$file")"
  cp "$ROOT_DIR/$file" "$TMP_DIR/$file"
done

mkdir -p "$TMP_DIR/.github/workflows"
cat > "$TMP_DIR/.github/workflows/production-checks.yml" <<'YAML'
jobs:
  registration-consent-contract:
    steps:
      - run: CONSENT_GATE_REQUIRE_RUNTIME=1 bash scripts/registration-consent-contract-gate.sh
YAML

# The fixture tree has no backend/vendor, so the executed backend tier is not
# available here; CONSENT_GATE_REQUIRE_RUNTIME is covered by case 6 below.
run_gate() {
  set +e
  gate_output="$(bash "$TMP_DIR/scripts/registration-consent-contract-gate.sh" 2>&1)"
  gate_status=$?
  set -e
}

expect_failure() {
  local label="$1" expected="$2"
  run_gate
  if (( gate_status == 0 )); then
    echo "registration consent gate accepted a broken contract: $label" >&2
    echo "$gate_output" >&2
    exit 1
  fi
  if ! grep -qF "$expected" <<<"$gate_output"; then
    echo "registration consent gate failed for the wrong reason: $label" >&2
    echo "$gate_output" >&2
    exit 1
  fi
}

# 1. Unmodified contract passes the static and executed frontend tiers.
run_gate
if (( gate_status != 0 )); then
  echo 'registration consent gate rejected the real contract' >&2
  echo "$gate_output" >&2
  exit 1
fi
grep -qF 'registration consent frontend contract OK' <<<"$gate_output"

# 2. A consent field silently dropped from the payload. Every string the old
#    assertions searched for is still present in the file.
sed -i 's/^    terms_version: LEGAL_DOCUMENT_VERSIONS.terms,$//' "$TMP_DIR/src/utils/registrationConsent.js"
grep -qF "terms: '2026-08-03'" "$TMP_DIR/src/utils/registrationConsent.js"
expect_failure 'terms_version dropped from the payload' 'dropped the "terms_version" field'

# 3. The OAuth registration hand-off stops carrying the consent payload, which
#    would leave the backend unable to rebuild consent from its one-time state.
cp "$ROOT_DIR/src/utils/registrationConsent.js" "$TMP_DIR/src/utils/registrationConsent.js"
python3 - "$TMP_DIR/src/utils/registrationConsent.js" <<'PY'
import sys
path = sys.argv[1]
source = open(path, encoding='utf-8').read()
start = source.index('  if (registrationPayload) {')
end = source.index('  return url.toString();')
source = source[:start] + source[end:]
open(path, 'w', encoding='utf-8').write(source)
PY
expect_failure 'OAuth redirect drops the consent payload' 'OAuth registration hand-off'

# 4. The frontend stops failing closed on an invalid client timestamp.
cp "$ROOT_DIR/src/utils/registrationConsent.js" "$TMP_DIR/src/utils/registrationConsent.js"
sed -i "s/    throw new TypeError('acceptedAt must be a valid date');/    return {}/" "$TMP_DIR/src/utils/registrationConsent.js"
expect_failure 'invalid consent timestamp no longer rejected' 'invalid consent timestamp'

# 5. A workflow stops executing the backend contract.
cp "$ROOT_DIR/src/utils/registrationConsent.js" "$TMP_DIR/src/utils/registrationConsent.js"
sed -i '/CONSENT_GATE_REQUIRE_RUNTIME=1/d' "$TMP_DIR/.github/workflows/production-checks.yml"
expect_failure 'no CI job executes the backend contract' 'no CI job executes the backend registration consent contract'

# 6. A job that demands the backend runtime must not silently pass without it.
cat > "$TMP_DIR/.github/workflows/production-checks.yml" <<'YAML'
jobs:
  registration-consent-contract:
    steps:
      - run: CONSENT_GATE_REQUIRE_RUNTIME=1 bash scripts/registration-consent-contract-gate.sh
YAML
set +e
gate_output="$(CONSENT_GATE_REQUIRE_RUNTIME=1 bash "$TMP_DIR/scripts/registration-consent-contract-gate.sh" 2>&1)"
gate_status=$?
set -e
if (( gate_status == 0 )); then
  echo 'registration consent gate skipped the backend contract under CONSENT_GATE_REQUIRE_RUNTIME=1' >&2
  echo "$gate_output" >&2
  exit 1
fi
grep -qF 'phpunit is not installed' <<<"$gate_output"

echo 'registration consent contract gate regression test OK'
