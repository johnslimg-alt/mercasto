#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"

command -v curl >/dev/null 2>&1 || {
  echo "curl is required" >&2
  exit 1
}

echo "== Public manifest/config denial smoke =="

paths=(
  /composer.json
  /composer.lock
  /package.json
  /package-lock.json
  /pnpm-lock.yaml
  /yarn.lock
  /vite.config.js
  /vite.config.ts
  /vite.config.mjs
  /tailwind.config.js
  /tailwind.config.ts
  /tailwind.config.mjs
)

for path in "${paths[@]}"; do
  status="$(curl -k -sS -o /dev/null -w '%{http_code}' --max-time 20 "${BASE_URL}${path}")"
  echo "${path} -> ${status}"
  case "$status" in
    403|404|410) ;;
    *)
      echo "unexpected public status for ${path}: ${status}" >&2
      exit 1
      ;;
  esac
done

echo "public manifest/config denial smoke OK"
