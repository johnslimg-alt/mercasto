#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-.}"

if [[ ! -d "$ROOT" ]]; then
  echo "scan root does not exist: $ROOT" >&2
  exit 1
fi

cd "$ROOT"

TARGETS=(
  src
  backend/app
  backend/resources
  backend/routes
  default.conf
)

EXISTING_TARGETS=()
for target in "${TARGETS[@]}"; do
  if [[ -e "$target" ]]; then
    EXISTING_TARGETS+=("$target")
  fi
done

if [[ ${#EXISTING_TARGETS[@]} -eq 0 ]]; then
  echo "no scan targets found" >&2
  exit 1
fi

PATTERN='MVP|stack trace|stacktrace|placeholder|En construcción|Página en construcción|Error Crítico|white screen'

echo "== Public copy/code scan =="
if grep -RInE \
  --exclude-dir=node_modules \
  --exclude-dir=vendor \
  --exclude-dir=storage \
  --exclude-dir=bootstrap/cache \
  --exclude='*.map' \
  --exclude='*.lock' \
  "$PATTERN" "${EXISTING_TARGETS[@]}"; then
  echo "public copy scan found banned or review-required public text" >&2
  exit 1
fi

echo "public copy scan OK"
