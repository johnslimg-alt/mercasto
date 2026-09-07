#!/usr/bin/env bash
set -euo pipefail

WARN_PERCENT="${HOST_STORAGE_WARN_PERCENT:-80}"
FAIL_PERCENT="${HOST_STORAGE_FAIL_PERCENT:-90}"

if ! [[ "$WARN_PERCENT" =~ ^[0-9]+$ && "$FAIL_PERCENT" =~ ^[0-9]+$ ]]; then
  echo "FAIL: host storage thresholds must be integer percentages" >&2
  exit 2
fi
if [ "$WARN_PERCENT" -ge "$FAIL_PERCENT" ] || [ "$FAIL_PERCENT" -gt 100 ]; then
  echo "FAIL: host storage thresholds are invalid" >&2
  exit 2
fi

read -r root_use root_available_kb < <(
  df -Pk / | awk 'NR == 2 { gsub(/%/, "", $5); print $5, $4 }'
)

printf 'root_filesystem_usage=%s%% available_kb=%s\n' "$root_use" "$root_available_kb"
if [ "$root_use" -ge "$FAIL_PERCENT" ]; then
  echo "FAIL: root filesystem usage is ${root_use}% (critical threshold ${FAIL_PERCENT}%); restore shared-host headroom without deleting unrelated project data." >&2
  exit 1
fi
if [ "$root_use" -ge "$WARN_PERCENT" ]; then
  echo "WARNING: root filesystem usage is ${root_use}%; review shared-host storage ownership and retention before it becomes operational pressure."
fi
