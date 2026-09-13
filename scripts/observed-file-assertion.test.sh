#!/usr/bin/env bash
set -euo pipefail

# Negative control for the "guard that cannot see its subject" defect class.
#
# A guard shaped like
#
#   if grep -qF "invariant" some/file; then fail; fi
#
# PASSES when `some/file` is missing: grep exits non-zero, the `if` takes its
# false branch and the invariant is never evaluated. Every gate listed below
# must therefore fail loudly, naming the path, when the file it observes is
# absent -- and still pass when it is present.
#
# The farm is a symlink mirror of the repository, so a test can remove a path
# without touching the working tree. `scripts/` and `backend/` are mirrored as
# real directories because the removals below live inside them.

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FARM="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-observed-file-test.XXXXXX")"
trap 'rm -rf "$FARM"' EXIT

mirror_dir() {
  local from="$1" to="$2"
  shift 2
  mkdir -p "$to"
  while IFS= read -r -d '' dir; do
    mkdir -p "$to/${dir#"$from"/}"
  done < <(find "$from" "$@" -type d -print0 2>/dev/null)
  while IFS= read -r -d '' file; do
    ln -s "$file" "$to/${file#"$from"/}"
  done < <(find "$from" "$@" -type f -print0 2>/dev/null)
}

build_farm() {
  local entry base
  for entry in "$REPO_DIR"/*; do
    base="$(basename "$entry")"
    case "$base" in
      scripts|backend) continue ;;
    esac
    ln -s "$entry" "$FARM/$base"
  done
  mirror_dir "$REPO_DIR/scripts" "$FARM/scripts"
  mirror_dir "$REPO_DIR/backend" "$FARM/backend" \
    -path "$REPO_DIR/backend/vendor" -prune -o \
    -path "$REPO_DIR/backend/storage" -prune -o
  mkdir -p "$FARM/.github/workflows"
  for file in "$REPO_DIR"/.github/workflows/*; do
    ln -s "$file" "$FARM/.github/workflows/$(basename "$file")"
  done
  ln -s "$REPO_DIR/.env.example" "$FARM/.env.example" 2>/dev/null || true
  ln -s "$REPO_DIR/.env.production.example" "$FARM/.env.production.example" 2>/dev/null || true
}

build_farm

run_gate() {
  ( cd "$FARM" && bash "$FARM/scripts/$1" )
}

# --- positive control: every hardened gate passes on the intact tree ---------
for gate in \
  ad-activation-lifecycle-gate.sh \
  backend-ai-provider-boundary-gate.sh \
  geo-source-pages-gate.sh \
  no-unused-graphql-surface-gate.sh \
  offsite-backup-contract-gate.sh \
  payment-payload-privacy-gate.sh \
  runtime-host-privilege-gate.sh \
  schema-drift-contract-gate.sh \
  moderation-pipeline-gate.sh \
  profile-edit-localization-contract-gate.sh \
  web-push-vapid-gate.sh; do
  if ! run_gate "$gate" >/dev/null 2>&1; then
    echo "expected $gate to pass on the intact tree" >&2
    exit 1
  fi
done

# --- negative controls: removing the observed path must fail loudly ----------
# gate | path whose absence a missing-file guard would otherwise swallow | exact expected message
# The expectation is the *sentinel* the hardened guard emits. A bare `grep: path:
# No such file or directory` also names the path, so matching the path alone would
# let a hollow gate satisfy this test for the wrong reason.
CASES=(
  "ad-activation-lifecycle-gate.sh|backend/app/Http/Middleware/EnforcePaidAdRenewal.php|FAIL: missing observed file"
  "backend-ai-provider-boundary-gate.sh|backend/config/services.php|FAIL: missing observed file"
  "geo-source-pages-gate.sh|backend/resources|FAIL: missing scan root"
  "no-unused-graphql-surface-gate.sh|backend/composer.json|FAIL: missing observed file"
  "no-unused-graphql-surface-gate.sh|backend/composer.lock|FAIL: missing observed file"
  "offsite-backup-contract-gate.sh|docs|FAIL: missing scan root"
  "payment-payload-privacy-gate.sh|backend/database/migrations/2026_04_15_000010_create_payments_table.php|FAIL: no payments migration matched"
  "runtime-host-privilege-gate.sh|docker-compose.yml|FAIL: missing observed file"
  "schema-drift-contract-gate.sh|backend/database/seeders/PaymentProductsSeeder.php|FAIL: missing observed file"
  "moderation-pipeline-gate.sh|backend/app/Jobs/ModerateAdWithAI.php|FAIL: missing observed file"
  "profile-edit-localization-contract-gate.sh|src/components/profile/BusinessProfileEditor.jsx|FAIL: missing observed file"
  "web-push-vapid-gate.sh|src|FAIL: missing scan root"
)

for case in "${CASES[@]}"; do
  gate="${case%%|*}"
  rest="${case#*|}"
  observed="${rest%%|*}"
  sentinel="${rest#*|}"
  # Some gates hold an absolute path (they resolve $ROOT first), so match on the
  # basename plus the sentinel rather than on an exact prefix.
  expected_operand="$(basename "$observed")"
  # A glob operand can only be named as a pattern.
  if [[ "$observed" == backend/database/migrations/*payments* ]]; then
    expected_operand='backend/database/migrations/*payments*'
  fi
  moved="$FARM/.removed-$(basename "$observed")"
  mv "$FARM/$observed" "$moved"
  # Every other *payments* migration must go too, or the payments glob still matches.
  payment_spill=()
  if [[ "$observed" == backend/database/migrations/*payments* ]]; then
    while IFS= read -r -d '' other; do
      mv "$FARM/$other" "$moved-$(basename "$other")"
      payment_spill+=("$FARM/$other|$moved-$(basename "$other")")
    done < <(cd "$FARM" && find backend/database/migrations -name '*payments*' -print0)
  fi

  output="$(run_gate "$gate" 2>&1)" && status=0 || status=$?
  if (( status == 0 )); then
    echo "FAIL: $gate passed with $observed absent (guard observes nothing)" >&2
    exit 1
  fi
  if [[ "$output" != *"$sentinel"* || "$output" != *"$expected_operand"* ]]; then
    echo "FAIL: $gate must fail with '$sentinel ... $expected_operand' when $observed is absent" >&2
    echo "$output" >&2
    exit 1
  fi

  mv "$moved" "$FARM/$observed"
  for entry in "${payment_spill[@]:-}"; do
    [ -n "$entry" ] || continue
    mv "${entry#*|}" "${entry%%|*}"
  done

  if ! run_gate "$gate" >/dev/null 2>&1; then
    echo "FAIL: $gate did not return to passing after $observed was restored" >&2
    exit 1
  fi
done

echo "observed-file assertion tests OK"
