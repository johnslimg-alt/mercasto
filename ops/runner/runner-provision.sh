#!/usr/bin/env bash
# Idempotent provisioning for the Mercasto self-hosted GitHub Actions runner.
#
# Why: on 2026-09-10 the runner was killed by the Linux OOM killer after
# forgotten Vite processes accumulated ~11.6 GiB RSS. The restart policy and the
# cleanup routine existed only as hand-made changes on the VPS, so a rebuilt or
# additional runner would silently regress.
#
# Installs (all idempotent):
#   * restart policy drop-in          Restart=on-failure, RestartSec=10s
#   * cgroup kill + OOM bias drop-in  KillMode=control-group, OOMScoreAdjust=500
#   * orphan cleanup oneshot + timer  every 15 minutes, root-owned
#   * /etc/mercasto-runner/stability.env thresholds
#
# Usage:
#   ops/runner/runner-provision.sh --dry-run     # default, prints the plan
#   ops/runner/runner-provision.sh --apply
#   ops/runner/runner-provision.sh --apply --runner-unit actions.runner.owner-repo.host.service
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

APPLY=0
RUNNER_UNITS=""
CONFIG_DIR="/etc/mercasto-runner"
SYSTEMD_DIR="/etc/systemd/system"
CLEANUP_LOG="/var/log/mercasto-runner-orphan-cleanup.log"
OOM_SCORE_ADJUST="${MERC_RUNNER_OOM_SCORE_ADJUST:-500}"
MEMORY_HIGH="${MERC_RUNNER_MEMORY_HIGH:-}"
MIN_AVAILABLE_MB="${MERC_CI_MIN_AVAILABLE_MB:-4096}"
MAX_AGE_SECONDS="${MERC_RUNNER_ORPHAN_MAX_AGE_SECONDS:-1800}"
CLEANUP_INTERVAL="${MERC_RUNNER_CLEANUP_INTERVAL:-15min}"

usage() {
  cat <<'USAGE'
Usage: ops/runner/runner-provision.sh [options]

  --apply                  write the changes (default: dry-run plan only)
  --dry-run                print the plan without touching the host
  --runner-unit <unit>     provision one specific runner unit (repeatable);
                           default: every actions.runner.*.service unit
  --cleanup-interval <v>   systemd timer interval (default 15min)
  -h, --help               show this help

Environment: MERC_RUNNER_OOM_SCORE_ADJUST, MERC_RUNNER_MEMORY_HIGH,
MERC_CI_MIN_AVAILABLE_MB, MERC_RUNNER_ORPHAN_MAX_AGE_SECONDS.
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --apply) APPLY=1; shift ;;
    --dry-run) APPLY=0; shift ;;
    --runner-unit) RUNNER_UNITS="${RUNNER_UNITS} ${2:?--runner-unit requires a value}"; shift 2 ;;
    --cleanup-interval) CLEANUP_INTERVAL="${2:?--cleanup-interval requires a value}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [ "$APPLY" -eq 1 ] && [ "$(id -u)" -ne 0 ]; then
  echo "--apply requires root" >&2
  exit 2
fi

if ! command -v systemctl >/dev/null 2>&1; then
  if [ "$APPLY" -eq 1 ]; then
    echo "systemctl is required for --apply (this host has no systemd)" >&2
    exit 2
  fi
  echo "note: systemctl is unavailable; the dry-run still reports the intended units"
fi

run() {
  if [ "$APPLY" -eq 1 ]; then
    "$@"
  else
    printf 'DRY-RUN: %s\n' "$*"
  fi
}

write_file() {
  local path="$1" mode="$2" owner="$3" content="$4"
  if [ "$APPLY" -eq 1 ]; then
    install -d -m 0755 "$(dirname "$path")"
    printf '%s\n' "$content" >"$path"
    chmod "$mode" "$path"
    chown "$owner" "$path"
    echo "wrote $path"
  else
    printf 'DRY-RUN: write %s (%s %s)\n' "$path" "$mode" "$owner"
  fi
}

discover_units() {
  command -v systemctl >/dev/null 2>&1 || return 0
  systemctl list-units --type=service --all --no-legend --plain 'actions.runner.*' 2>/dev/null \
    | awk '{print $1}' | grep -E '^actions\.runner\..*\.service$' || true
}

UNITS="$RUNNER_UNITS"
if [ -z "${UNITS// /}" ]; then
  # shellcheck disable=SC2207
  UNITS="$(discover_units)"
fi

INSTALLED_UNITS=()
for unit in $UNITS; do
  [ -n "$unit" ] || continue
  INSTALLED_UNITS+=("$unit")
done

echo "== Mercasto runner provisioning =="
echo "repository:      $REPO_DIR"
echo "mode:            $( [ "$APPLY" -eq 1 ] && echo apply || echo dry-run )"
echo "runner units:    ${INSTALLED_UNITS[*]:-<none discovered>}"
echo "cleanup timer:   mercasto-runner-orphan-cleanup.timer every ${CLEANUP_INTERVAL}"
echo

for unit in "${INSTALLED_UNITS[@]:-}"; do
  [ -n "$unit" ] || continue
  dropin_dir="$SYSTEMD_DIR/${unit}.d"

  restart_content="# Managed by ops/runner/runner-provision.sh — do not edit by hand.
[Service]
Restart=on-failure
RestartSec=10s
KillMode=control-group
TimeoutStopSec=5min"
  write_file "$dropin_dir/60-restart-policy.conf" 0644 root:root "$restart_content"

  oom_content="# Managed by ops/runner/runner-provision.sh — do not edit by hand.
# Bias the kernel towards the CI runner instead of production containers when
# the host is genuinely out of memory.
[Service]
OOMScoreAdjust=${OOM_SCORE_ADJUST}"
  if [ -n "$MEMORY_HIGH" ]; then
    oom_content="${oom_content}
MemoryHigh=${MEMORY_HIGH}"
  fi
  write_file "$dropin_dir/70-oom-protection.conf" 0644 root:root "$oom_content"

  if [ "$APPLY" -eq 1 ]; then
    systemctl daemon-reload
    systemctl restart "$unit" >/dev/null 2>&1 || true
    echo "reloaded $unit"
  else
    echo "DRY-RUN: systemctl daemon-reload && systemctl restart $unit"
  fi
done

cleanup_service="$(sed "s|__REPO__|$REPO_DIR|g" "$SCRIPT_DIR/mercasto-runner-orphan-cleanup.service")"
write_file "$SYSTEMD_DIR/mercasto-runner-orphan-cleanup.service" 0644 root:root "$cleanup_service"

cleanup_timer="$(sed "s|__CLEANUP_INTERVAL__|$CLEANUP_INTERVAL|g" "$SCRIPT_DIR/mercasto-runner-orphan-cleanup.timer")"
write_file "$SYSTEMD_DIR/mercasto-runner-orphan-cleanup.timer" 0644 root:root "$cleanup_timer"

env_content="# Managed by ops/runner/runner-provision.sh — do not edit by hand.
# Reap test processes older than this many seconds.
MERC_RUNNER_ORPHAN_MAX_AGE_SECONDS=${MAX_AGE_SECONDS}
# Refuse to start a heavy browser suite below this much available memory.
MERC_CI_MIN_AVAILABLE_MB=${MIN_AVAILABLE_MB}
MERC_RUNNER_ORPHAN_LOG=${CLEANUP_LOG}"
write_file "$CONFIG_DIR/stability.env" 0644 root:root "$env_content"

run touch "$CLEANUP_LOG"

if [ "$APPLY" -eq 1 ]; then
  systemctl daemon-reload
  systemctl enable --now mercasto-runner-orphan-cleanup.timer >/dev/null 2>&1 || true
  systemctl start mercasto-runner-orphan-cleanup.service || true

  echo
  echo "== Verification =="
  systemctl is-enabled mercasto-runner-orphan-cleanup.timer 2>/dev/null || true
  systemctl list-timers mercasto-runner-orphan-cleanup.timer --no-legend 2>/dev/null || true
  for unit in "${INSTALLED_UNITS[@]:-}"; do
    [ -n "$unit" ] || continue
    printf '%s: Restart=%s RestartSec=%s KillMode=%s OOMScoreAdjust=%s active=%s\n' \
      "$unit" \
      "$(systemctl show -p Restart --value "$unit" 2>/dev/null || echo '?')" \
      "$(systemctl show -p RestartSec --value "$unit" 2>/dev/null || echo '?')" \
      "$(systemctl show -p KillMode --value "$unit" 2>/dev/null || echo '?')" \
      "$(systemctl show -p OOMScoreAdjust --value "$unit" 2>/dev/null || echo '?')" \
      "$(systemctl is-active "$unit" 2>/dev/null || echo '?')"
  done
  bash "$REPO_DIR/scripts/runner-orphan-cleanup.sh" --scope mercasto | tail -3
  echo "RUNNER_PROVISION=PASS"
else
  echo
  echo "DRY-RUN complete. Re-run with --apply to provision this host."
fi
