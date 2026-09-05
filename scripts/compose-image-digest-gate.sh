#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.yml"

echo "== Compose image digest gate =="

test -f "$COMPOSE_FILE"
mapfile -t images < <(awk '/^[[:space:]]*image:[[:space:]]*/ {sub(/^[[:space:]]*image:[[:space:]]*/, ""); gsub(/["'\'']/, ""); print}' "$COMPOSE_FILE")

if (( ${#images[@]} == 0 )); then
  echo "FAIL: no external Compose images found" >&2
  exit 1
fi

for image in "${images[@]}"; do
  if [[ ! "$image" =~ @sha256:[0-9a-f]{64}$ ]]; then
    echo "FAIL: Compose image is not pinned to an immutable sha256 digest: $image" >&2
    exit 1
  fi
done

echo "compose_images_pinned=${#images[@]}"
echo "Compose image digest gate OK"
