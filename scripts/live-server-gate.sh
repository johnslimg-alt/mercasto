#!/usr/bin/env bash
set -euo pipefail

OPERATION="${OPERATION:-${1:-status}}"
SSH_HOST="${SSH_HOST:-}"
SSH_PORT="${SSH_PORT:-22}"
SSH_USER="${SSH_USER:-}"
SSH_KEY="${SSH_KEY:-}"
LIVE_GATE_SSH_DEBUG="${LIVE_GATE_SSH_DEBUG:-1}"

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

install -m 700 -d ~/.ssh
key_file="$(mktemp)"
pub_file="${key_file}.pub"
trap 'rm -f "${key_file}" "${pub_file}"' EXIT
printf '%s\n' "${SSH_KEY}" >"${key_file}"
chmod 600 "${key_file}"

if ! ssh-keygen -y -f "${key_file}" >"${pub_file}" 2>/dev/null; then
  echo "Invalid SSH private key format for live gate secret" >&2
  exit 65
fi

echo "== Live gate SSH public key fingerprint =="
ssh-keygen -lf "${pub_file}"

ssh_args=(
  -i "${key_file}"
  -p "${SSH_PORT}"
  -o BatchMode=yes
  -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=accept-new
  -o ServerAliveInterval=15
  -o ServerAliveCountMax=4
)

if [ "${LIVE_GATE_SSH_DEBUG}" = "1" ]; then
  echo "== Live gate SSH debug enabled =="
  ssh_args=(-vvv "${ssh_args[@]}")
fi

ssh "${ssh_args[@]}" \
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
