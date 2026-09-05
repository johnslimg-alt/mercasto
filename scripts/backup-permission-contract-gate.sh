#!/usr/bin/env bash
set -euo pipefail
COMPOSE="docker-compose.yml"
ROTATE="scripts/rotate-internal-secrets.sh"
OPS=".github/workflows/server-ops.yml"
PRECHECK="scripts/os-maintenance-precheck.sh"
echo "== Backup permission contract gate =="
grep -qF 'umask 0027;' "$COMPOSE"
grep -qF 'umask 0027' "$ROTATE"
grep -qF 'umask 0027' "$OPS"
grep -qF 'backup permissions OK' "$PRECHECK"
grep -qF -- "-perm /0137" "$PRECHECK"
echo "backup permission contract gate OK"
