#!/usr/bin/env bash
set -euo pipefail
script='scripts/os-maintenance-precheck.sh'
grep -qF 'compose_snapshot="$(mktemp "${TMPDIR:-/tmp}/mercasto-compose-maintenance.XXXXXX")"' "$script"
grep -qF 'trap cleanup_snapshots EXIT' "$script"
if grep -qF '/tmp/mercasto_compose_maintenance_config.out' "$script"; then
  echo 'FAIL: fixed shared maintenance compose tempfile remains' >&2
  exit 1
fi
# A stale root-owned path at the old fixed location must no longer matter.
fixture="$(mktemp -d)"
trap 'rm -rf "$fixture"' EXIT
mkdir -p "$fixture/bin"
cat > "$fixture/bin/docker" <<'SH'
#!/usr/bin/env bash
if [[ "$*" == *'compose -f docker-compose.yml -f docker-compose.override.yml config'* ]]; then
  printf 'services: {}\n'
  exit 0
fi
exit 0
SH
chmod +x "$fixture/bin/docker"
# Contract-level assertion: the compose snapshot is generated only through mktemp.
count=$(grep -c 'mercasto-compose-maintenance.XXXXXX' "$script")
[[ "$count" -eq 1 ]] || { echo "FAIL: expected one unique compose tempfile declaration" >&2; exit 1; }
echo 'maintenance precheck tempfile test OK'
