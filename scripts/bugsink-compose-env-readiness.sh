#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env}"
test -r "$ENV_FILE"

required=(
  BUGSINK_SECRET_KEY
  BUGSINK_ADMIN_EMAIL
  BUGSINK_ADMIN_PASSWORD
  BUGSINK_ALERT_TOKEN
)

missing=0
for key in "${required[@]}"; do
  value="$(sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1)"
  if [ -z "$value" ]; then
    echo "FAIL: $key is empty or missing" >&2
    missing=1
  fi
done

if grep -Eq '^BUGSINK_ADMIN_EMAIL=.*invalid\.example' "$ENV_FILE"; then
  echo "FAIL: Bugsink production env contains a CI placeholder email" >&2
  missing=1
fi
if [ "$missing" -ne 0 ]; then
  exit 1
fi

echo "Bugsink production compose env readiness OK"
