#!/usr/bin/env bash
set -euo pipefail

OPERATION="${OPERATION:-${1:-status}}"
SSH_HOST="${SSH_HOST:-}"
SSH_PORT="${SSH_PORT:-22}"
SSH_USER="${SSH_USER:-}"
SSH_KEY="${SSH_KEY:-}"

case "${OPERATION}" in
  status|verify_quick|security_smoke|seo_aeo_smoke) ;;
  *) echo "Unsupported operation: ${OPERATION}" >&2; exit 64 ;;
esac

test -n "${SSH_HOST}" || { echo "Missing SSH_HOST" >&2; exit 64; }
test -n "${SSH_USER}" || { echo "Missing SSH_USER" >&2; exit 64; }
test -n "${SSH_KEY}" || { echo "Missing SSH_KEY" >&2; exit 64; }

case "${SSH_PORT}" in
  ''|*[!0-9]*) echo "Invalid SSH_PORT" >&2; exit 64 ;;
esac

key_file="$(mktemp)"
trap 'rm -f "${key_file}"' EXIT

# Write the key exactly as-is (GitHub stores multiline secrets with real newlines).
# If the secret was stored as a single line with literal \n, normalise those too.
printf '%s' "${SSH_KEY}" | sed $'s/\\\\n/\\\n/g' > "${key_file}"
# Guarantee trailing newline — OpenSSH requires it for ED25519 keys
printf '\n' >> "${key_file}"
chmod 600 "${key_file}"

# Verify the key looks sane (type + base64 body) without printing the secret
if ! grep -qE '^-----BEGIN (OPENSSH|RSA|EC|DSA) PRIVATE KEY-----' "${key_file}"; then
  echo "ERROR: SSH key does not have a valid PEM header. Check MERCASTO_SSH_PRIVATE_KEY secret format." >&2
  exit 1
fi

ssh \
  -i "${key_file}" \
  -p "${SSH_PORT}" \
  -o BatchMode=yes \
  -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=yes \
  -o ServerAliveInterval=15 \
  -o ServerAliveCountMax=4 \
  "${SSH_USER}@${SSH_HOST}" \
  "OPERATION='${OPERATION}' bash -s" <<'REMOTE'
set -euo pipefail
cd /var/www/mercasto

echo "== Git HEAD =="
git rev-parse --short HEAD

echo "== Git status =="
git status --short

echo "== Docker compose status =="
docker compose ps

echo "== Docker compose config =="
docker compose -f docker-compose.yml -f docker-compose.override.yml config >/tmp/mercasto_compose_check.out

echo "== Nginx config =="
docker compose -f docker-compose.yml -f docker-compose.override.yml exec -T mercasto-frontend nginx -t

echo "== server-operator ${OPERATION} =="
OPERATION="${OPERATION}" bash scripts/server-operator.sh "${OPERATION}"
REMOTE
