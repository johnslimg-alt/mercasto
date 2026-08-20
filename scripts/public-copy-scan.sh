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
  index.html
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

PATTERN='MVP|stack trace|stacktrace|En construcción|Página en construcción|Error Crítico|Espacio Publicitario|white screen|coming soon|under construction|lorem ipsum|reefmt\.com|localhost:|127\.0\.0\.1|ngrok'
# Docker embedded DNS is a legitimate nginx resolver, but loopback URLs and
# other 127.0.0.1* uses remain review-required. Allow only a complete resolver
# directive containing Docker's exact 127.0.0.11 address and known safe options.
ALLOWED_DOCKER_RESOLVER='^[^:]+:[0-9]+:[[:space:]]*resolver[[:space:]]+127\.0\.0\.11([[:space:]]+(valid=[0-9]+[smhd]|ipv6=(on|off)))*[[:space:]]*;[[:space:]]*$'

echo "== Public copy/code scan =="
matches="$(grep -RInE \
  --exclude-dir=node_modules \
  --exclude-dir=vendor \
  --exclude-dir=storage \
  --exclude-dir=bootstrap/cache \
  --exclude='*.map' \
  --exclude='*.lock' \
  --exclude='paidAdRenewalBridge.js' \
  "$PATTERN" "${EXISTING_TARGETS[@]}" || true)"

if [[ -n "$matches" ]]; then
  unexpected="$(printf '%s\n' "$matches" | grep -Ev "$ALLOWED_DOCKER_RESOLVER" || true)"
  if [[ -n "$unexpected" ]]; then
    printf '%s\n' "$unexpected"
    echo "public copy scan found banned or review-required public text" >&2
    exit 1
  fi
fi

echo "public copy scan OK"
