#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
input=$'GET|HEAD  / generated::PfVCSVo1fXVmFbdY\nPOST api/ads generated::aRsX8Zwgy1oZPenA › Api\\AdController@store\nGET api/health named.route'
expected=$'GET|HEAD  / generated::<auto>\nPOST api/ads generated::<auto> › Api\\AdController@store\nGET api/health named.route'
actual="$(printf '%s\n' "$input" | bash "$ROOT_DIR/scripts/normalize-route-inventory.sh")"

if [[ "$actual" != "$expected" ]]; then
  echo "route inventory normalization mismatch" >&2
  diff -u <(printf '%s\n' "$expected") <(printf '%s\n' "$actual") >&2 || true
  exit 1
fi

if grep -Eq 'generated::[[:alnum:]_]{8,}' <<<"$actual"; then
  echo "random Laravel route name survived normalization" >&2
  exit 1
fi

echo "route inventory normalization test OK"
