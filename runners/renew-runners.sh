#!/bin/bash
set -euo pipefail

: "${GH_PAT:?Set GH_PAT in the environment before running this script}"
REPO="${REPO:-johnslimg-alt/mercasto}"

TOKEN="$(curl -fsSL -X POST \
  -H "Authorization: Bearer ${GH_PAT}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/${REPO}/actions/runners/registration-token" | jq -r .token)"

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Failed to obtain GitHub runner registration token" >&2
  exit 1
fi

install -m 600 /dev/null /var/www/mercasto/runners/.env
printf 'GITHUB_RUNNER_TOKEN=%s\n' "$TOKEN" > /var/www/mercasto/runners/.env

cd /var/www/mercasto/runners
docker compose up -d
