#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACT_DIR="${1:-/tmp/mercasto-dependency-audit}"
mkdir -p "$ARTIFACT_DIR"

cd "$ROOT_DIR"

echo "== Node dependency update audit =="
if command -v npm >/dev/null 2>&1 && [ -f package.json ]; then
  npm outdated --json > "$ARTIFACT_DIR/npm-outdated.json" 2> "$ARTIFACT_DIR/npm-outdated.stderr" || true
  npm audit --json > "$ARTIFACT_DIR/npm-audit.json" 2> "$ARTIFACT_DIR/npm-audit.stderr" || true
else
  echo "npm or package.json not available" | tee "$ARTIFACT_DIR/npm-skipped.txt"
fi

echo "== Composer dependency update audit =="
if command -v composer >/dev/null 2>&1 && [ -f backend/composer.json ]; then
  (
    cd backend
    composer outdated --format=json > "$ARTIFACT_DIR/composer-outdated.json" 2> "$ARTIFACT_DIR/composer-outdated.stderr" || true
    composer audit --format=json > "$ARTIFACT_DIR/composer-audit.json" 2> "$ARTIFACT_DIR/composer-audit.stderr" || true
  )
else
  echo "composer or backend/composer.json not available" | tee "$ARTIFACT_DIR/composer-skipped.txt"
fi

echo "== Docker image update/security audit =="
if command -v docker >/dev/null 2>&1; then
  docker compose config --images > "$ARTIFACT_DIR/docker-compose-images.txt" 2> "$ARTIFACT_DIR/docker-compose-images.stderr" || true

  if docker scout version >/dev/null 2>&1; then
    while IFS= read -r image; do
      [ -z "$image" ] && continue
      safe_name="$(printf '%s' "$image" | tr '/:@' '___')"
      docker scout quickview "$image" > "$ARTIFACT_DIR/docker-scout-${safe_name}.txt" 2>&1 || true
      docker scout recommendations "$image" > "$ARTIFACT_DIR/docker-scout-recommendations-${safe_name}.txt" 2>&1 || true
    done < "$ARTIFACT_DIR/docker-compose-images.txt"
  else
    echo "docker scout not available" | tee "$ARTIFACT_DIR/docker-scout-skipped.txt"
  fi
else
  echo "docker not available" | tee "$ARTIFACT_DIR/docker-skipped.txt"
fi

echo "== Audit artifact summary =="
find "$ARTIFACT_DIR" -maxdepth 1 -type f -printf '%f\n' | sort

echo "Dependency update audit completed: $ARTIFACT_DIR"
