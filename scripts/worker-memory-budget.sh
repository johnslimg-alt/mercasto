#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
MEMTOTAL_KIB="${MEMTOTAL_KIB:-$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)}"
HEADROOM_PERCENT="${HEADROOM_PERCENT:-30}"
MIN_HEADROOM_MIB="${MIN_HEADROOM_MIB:-4096}"

[[ "$MEMTOTAL_KIB" =~ ^[0-9]+$ ]] || { echo "FAIL: invalid MemTotal" >&2; exit 2; }
host_mib=$((MEMTOTAL_KIB / 1024))
percent_headroom_mib=$((host_mib * HEADROOM_PERCENT / 100))
headroom_mib=$percent_headroom_mib
(( headroom_mib < MIN_HEADROOM_MIB )) && headroom_mib=$MIN_HEADROOM_MIB
usable_mib=$((host_mib - headroom_mib))
(( usable_mib > 0 )) || { echo "FAIL: host memory is below required safety headroom" >&2; exit 1; }
# Queue workers may consume at most 25% of host RAM and never consume reserved headroom.
worker_budget_mib=$((host_mib * 25 / 100))
(( worker_budget_mib > usable_mib )) && worker_budget_mib=$usable_mib

mapfile -t worker_limits < <(docker compose -f "$COMPOSE_FILE" config --no-interpolate --format json | python3 -c '
import json,sys
x=json.load(sys.stdin)
for name, svc in x.get("services",{}).items():
    cmd=" ".join(svc.get("command") or []) if isinstance(svc.get("command"), list) else str(svc.get("command") or "")
    if "queue:work" not in cmd: continue
    memory=((svc.get("deploy") or {}).get("resources") or {}).get("limits",{}).get("memory")
    if not memory:
        print(f"{name}:MISSING")
        continue
    if isinstance(memory, int):
        mib=memory//1024//1024
    else:
        text=str(memory).strip().upper()
        units={"K":1/1024,"M":1,"G":1024,"T":1024*1024}
        unit=text[-1] if text[-1] in units else "M"
        number=float(text[:-1] if text[-1] in units else text)
        mib=int(number*units[unit])
    print(f"{name}:{mib}")
')

worker_total_mib=0
for row in "${worker_limits[@]}"; do
  name="${row%%:*}"; mib="${row#*:}"
  [[ "$mib" != MISSING ]] || { echo "FAIL: $name has no memory limit" >&2; exit 1; }
  worker_total_mib=$((worker_total_mib + mib))
done
(( ${#worker_limits[@]} > 0 )) || { echo "FAIL: no queue workers found" >&2; exit 1; }

printf 'host_mib=%d headroom_mib=%d worker_budget_mib=%d configured_worker_mib=%d worker_processes=%d\n' \
  "$host_mib" "$headroom_mib" "$worker_budget_mib" "$worker_total_mib" "${#worker_limits[@]}"

if (( worker_total_mib > worker_budget_mib )); then
  echo "FAIL: configured queue worker memory exceeds safe host budget" >&2
  exit 1
fi

echo "worker memory budget OK"
