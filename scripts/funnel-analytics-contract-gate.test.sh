#!/usr/bin/env bash
# Control for the fail-closed negative guards in
# scripts/funnel-analytics-contract-gate.sh.
#
# Eng-11's finding: the bare `if grep -qF needle file; then ... fi` idiom treats a
# MISSING file as "no match" (grep exits 2 and the `if` reads false), so deleting
# the asserted file turned the guard into a silent no-op — the gate kept passing.
#
# This control proves the gate now fails loudly when an asserted file disappears
# or when the contract it guards is reintroduced, and it pins the old idiom's
# behaviour so nobody "simplifies" the helper back.
#
# It is a *.test.sh and therefore NOT auto-discovered: it is wired explicitly into
# scripts/static-safety-scans.sh.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GATE_REL="scripts/funnel-analytics-contract-gate.sh"
FUNNEL_TEST_REL="tests/funnel-analytics-contract.test.mjs"
LIVE_AUTH_REL="src/app/useAuthSessionState.js"

scratch="$(mktemp -d)"
cleanup() { rm -rf "${scratch}"; }
trap cleanup EXIT

echo "== Funnel gate hollowing control =="

# Control 0 — the failure mode itself. A bare `if grep` over a missing file must
# exit 0 (silent pass); if this ever stops being true, the mitigation below is no
# longer the thing protecting us and this control says so.
status=0
( if grep -qF "needle" "${scratch}/definitely-missing.js" 2>/dev/null; then exit 1; fi ) || status=$?
if [ "${status}" -ne 0 ]; then
  echo "Control 0 failed: expected the bare 'if grep' idiom to pass silently on a missing file" >&2
  exit 1
fi
echo "control 0 OK: bare 'if grep' on a missing file is a silent no-op (the hollowing this fixes)"

# The gate and its test need only tracked files (no node_modules), so a git
# archive of HEAD is enough. The files under test are then overlaid from the
# working tree, so this control also validates uncommitted edits.
git -C "${ROOT_DIR}" archive HEAD | tar -x -C "${scratch}"
for rel in "${GATE_REL}" "${FUNNEL_TEST_REL}" "${LIVE_AUTH_REL}"; do
  mkdir -p "${scratch}/$(dirname "${rel}")"
  cp "${ROOT_DIR}/${rel}" "${scratch}/${rel}"
done

run_gate() { ( cd "${scratch}" && bash "${GATE_REL}" ); }

# Control 1 — the gate passes on the current sources.
if ! run_gate >/dev/null 2>&1; then
  echo "Control 1 failed: the gate must pass on the current sources" >&2
  ( cd "${scratch}" && bash "${GATE_REL}" ) >&2 || true
  exit 1
fi
echo "control 1 OK: gate passes on current sources"

# Control 2 — deleting an asserted live file fails the gate loudly.
rm -f "${scratch}/${LIVE_AUTH_REL}"
status=0
gate_output="$( cd "${scratch}" && bash "${GATE_REL}" 2>&1 )" || status=$?
if [ "${status}" -eq 0 ]; then
  echo "Control 2 failed: the gate PASSED with ${LIVE_AUTH_REL} deleted (silent hollowing)" >&2
  exit 1
fi
if ! printf '%s' "${gate_output}" | grep -qF "Missing asserted file: ${LIVE_AUTH_REL}"; then
  echo "Control 2 failed: expected a missing-file error, got: ${gate_output}" >&2
  exit 1
fi
echo "control 2 OK: a deleted asserted file fails the gate loudly"

# Control 3 — deleting the asserted live file also fails the unit contract, so
# the test half cannot silently pass either.
status=0
test_output="$( cd "${scratch}" && node --test "${FUNNEL_TEST_REL}" 2>&1 )" || status=$?
if [ "${status}" -eq 0 ]; then
  echo "Control 3 failed: the funnel contract test passed with ${LIVE_AUTH_REL} deleted" >&2
  exit 1
fi
echo "control 3 OK: the funnel contract test fails when its asserted file is missing"

# Control 4 — reintroducing a duplicate email emitter in the live App.jsx fails.
git -C "${ROOT_DIR}" archive HEAD | tar -x -C "${scratch}"
for rel in "${GATE_REL}" "${FUNNEL_TEST_REL}" "${LIVE_AUTH_REL}"; do
  mkdir -p "${scratch}/$(dirname "${rel}")"
  cp "${ROOT_DIR}/${rel}" "${scratch}/${rel}"
done
cat >>"${scratch}/src/App.jsx" <<'EOF'

// control injection: a duplicate email sign_up emitter
events.registered({ event_id: 'control', meta_event_id: 'control', method: 'email' });
EOF
status=0
gate_output="$( cd "${scratch}" && bash "${GATE_REL}" 2>&1 )" || status=$?
if [ "${status}" -eq 0 ]; then
  echo "Control 4 failed: the gate accepted a duplicate email sign_up emitter" >&2
  exit 1
fi
if ! printf '%s' "${gate_output}" | grep -qF "must not be duplicated"; then
  echo "Control 4 failed: expected the duplicate-emitter guard to fire, got: ${gate_output}" >&2
  exit 1
fi
echo "control 4 OK: a duplicate email emitter fails the gate"

# Control 5 — a duplicate emitter in the live auth state module fails too, so the
# retargeted contract is not weaker than the dead-file assertion it replaced.
cat >>"${scratch}/${LIVE_AUTH_REL}" <<'EOF'

// control injection: a registration emitter in the live auth state module
export function controlInjectedRegistered() {
  return events.registered({ method: 'email' });
}
EOF
status=0
gate_output="$( cd "${scratch}" && bash "${GATE_REL}" 2>&1 )" || status=$?
if [ "${status}" -eq 0 ]; then
  echo "Control 5 failed: the gate accepted a registration emitter in ${LIVE_AUTH_REL}" >&2
  exit 1
fi
if ! printf '%s' "${gate_output}" | grep -qF "must not emit registration events"; then
  echo "Control 5 failed: expected the live-auth-state guard to fire, got: ${gate_output}" >&2
  exit 1
fi
echo "control 5 OK: a registration emitter in the live auth state fails the gate"

echo "funnel gate hollowing control OK"
