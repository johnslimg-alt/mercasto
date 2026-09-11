#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== runner provisioning contract =="

service="$ROOT_DIR/ops/runner/mercasto-runner-orphan-cleanup.service"
timer="$ROOT_DIR/ops/runner/mercasto-runner-orphan-cleanup.timer"
provisioner="$ROOT_DIR/ops/runner/runner-provision.sh"

for path in "$service" "$timer" "$provisioner"; do
  if [ ! -f "$path" ]; then
    echo "missing runner provisioning artifact: $path" >&2
    exit 1
  fi
done

grep -qF 'ExecStart=/usr/bin/env bash __REPO__/scripts/runner-orphan-cleanup.sh --apply --scope mercasto' "$service"
grep -qF 'ConditionPathExists=__REPO__/scripts/runner-orphan-cleanup.sh' "$service"
grep -qF 'OnUnitActiveSec=__CLEANUP_INTERVAL__' "$timer"
grep -qF 'WantedBy=timers.target' "$timer"

# The dry-run must be safe on a host without systemd and must not mutate anything.
output="$(bash "$provisioner" --dry-run)"
case "$output" in
  *'DRY-RUN'*) ;;
  *) echo "provisioner dry-run produced no plan: $output" >&2; exit 1 ;;
esac
case "$output" in
  *'mercasto-runner-orphan-cleanup.timer'*) ;;
  *) echo "provisioner plan does not mention the cleanup timer" >&2; exit 1 ;;
esac

# Restart policy, cgroup kill and OOM bias are part of the runner drop-in.
grep -qF 'Restart=on-failure' "$provisioner"
grep -qF 'RestartSec=10s' "$provisioner"
grep -qF 'KillMode=control-group' "$provisioner"
grep -qF 'OOMScoreAdjust=${OOM_SCORE_ADJUST}' "$provisioner"

if command -v systemd-analyze >/dev/null 2>&1; then
  # Placeholders are not valid unit syntax, so verify the substituted form.
  tmp="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-runner-unit-test.XXXXXX")"
  trap 'rm -rf "$tmp"' EXIT
  sed "s|__REPO__|$ROOT_DIR|g" "$service" >"$tmp/cleanup.service"
  sed 's|__CLEANUP_INTERVAL__|15min|g' "$timer" >"$tmp/cleanup.timer"
  systemd-analyze verify "$tmp/cleanup.service" >/dev/null 2>&1 || {
    echo "systemd-analyze rejected the cleanup service unit" >&2
    exit 1
  }
fi

echo "runner provisioning contract OK"
