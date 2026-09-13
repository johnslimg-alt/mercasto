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
# working tree, so this control also validates uncommitted edits — including the
# shared matcher module, which does not exist in HEAD yet.
OVERLAY_FILES=(
  "${GATE_REL}"
  "${FUNNEL_TEST_REL}"
  "${LIVE_AUTH_REL}"
  "scripts/funnel-emitter-contract.mjs"
)

overlay_working_tree() {
  git -C "${ROOT_DIR}" archive HEAD | tar -x -C "${scratch}"
  for rel in "${OVERLAY_FILES[@]}"; do
    mkdir -p "${scratch}/$(dirname "${rel}")"
    cp "${ROOT_DIR}/${rel}" "${scratch}/${rel}"
  done
}

overlay_working_tree

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

# Control 4 — every equivalent spelling of a duplicate email emitter in the live
# App.jsx fails the gate AND the unit contract. The first version of the guard saw
# only the single-quoted, single-spaced form, so the rest escaped both.
reset_scratch() {
  overlay_working_tree
}

spellings=(
  "events.registered({ event_id: 'control', meta_event_id: 'control', method: 'email' });"
  'events.registered({ method: "email" });'
  'events.registered({ method: `email` });'
  'events.registered({method:"email"});'
  "events.registered ( { method : 'email' } );"
)
for spelling in "${spellings[@]}"; do
  reset_scratch
  printf '\n// control injection: a duplicate email sign_up emitter\n%s\n' "${spelling}" >>"${scratch}/src/App.jsx"

  status=0
  gate_output="$( cd "${scratch}" && bash "${GATE_REL}" 2>&1 )" || status=$?
  if [ "${status}" -eq 0 ]; then
    echo "Control 4 failed: the gate accepted this duplicate email emitter: ${spelling}" >&2
    exit 1
  fi
  if ! printf '%s' "${gate_output}" | grep -qF "must not be duplicated"; then
    echo "Control 4 failed: expected the duplicate-emitter guard to fire for ${spelling}, got: ${gate_output}" >&2
    exit 1
  fi

  status=0
  test_output="$( cd "${scratch}" && node --test "${FUNNEL_TEST_REL}" 2>&1 )" || status=$?
  if [ "${status}" -eq 0 ]; then
    echo "Control 4 failed: the unit contract accepted this duplicate email emitter: ${spelling}" >&2
    exit 1
  fi
done
echo "control 4 OK: duplicate email emitters fail the gate and the unit contract in all 5 spellings"

# Control 4b — the guard must not over-block: legitimate non-email channels and a
# plain duplicate-channel call still pass, so the fix cannot start failing real code.
reset_scratch
cat >>"${scratch}/src/App.jsx" <<'EOF'

// control injection: legitimate non-email registration channels
events.registered({ method: 'telegram' });
events.registered({ method: oauthRegistrationMethod });
events.registered({ provider: 'email' });
EOF
if ! ( cd "${scratch}" && bash "${GATE_REL}" >/dev/null 2>&1 ); then
  echo "Control 4b failed: legitimate non-email emitters must not fail the gate" >&2
  ( cd "${scratch}" && bash "${GATE_REL}" ) >&2 || true
  exit 1
fi
if ! ( cd "${scratch}" && node --test "${FUNNEL_TEST_REL}" >/dev/null 2>&1 ); then
  echo "Control 4b failed: legitimate non-email emitters must not fail the unit contract" >&2
  exit 1
fi
echo "control 4b OK: legitimate non-email emitters still pass the gate and the contract"

# Control 4c — an unreadable asserted file fails the matcher closed (exit 2), so a
# missing App.jsx can never read as "no duplicate emitter".
status=0
missing_output="$( cd "${scratch}" && node scripts/funnel-emitter-contract.mjs src/definitely-missing.jsx 2>&1 )" || status=$?
if [ "${status}" -ne 2 ]; then
  echo "Control 4c failed: expected exit 2 for an unreadable target, got ${status}: ${missing_output}" >&2
  exit 1
fi
echo "control 4c OK: the matcher fails closed (exit 2) on an unreadable target"

# Control 5 — a duplicate emitter in the live auth state module fails too, so the
# retargeted contract is not weaker than the dead-file assertion it replaced.
reset_scratch
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

# Control 6 — the reviewer's exact reproduction: the double-quoted spelling,
# appended to App.jsx, must be rejected by the shared matcher invoked the way the
# gate invokes it.
reset_scratch
printf '\n// control injection: the reviewer double-quoted spelling\nevents.registered({ method: "email" });\n' >>"${scratch}/src/App.jsx"
status=0
reviewer_output="$( cd "${scratch}" && node scripts/funnel-emitter-contract.mjs src/App.jsx 2>&1 )" || status=$?
if [ "${status}" -eq 0 ]; then
  echo "Control 6 failed: the matcher accepted a double-quoted duplicate emitter" >&2
  exit 1
fi
if ! printf '%s' "${reviewer_output}" | grep -qF "duplicate email registration emitter"; then
  echo "Control 6 failed: expected the matcher to name the duplicate, got: ${reviewer_output}" >&2
  exit 1
fi
echo "control 6 OK: the reviewer's double-quoted emitter is rejected by the shared matcher"
echo "  ${reviewer_output}"

echo "funnel gate hollowing control OK"
