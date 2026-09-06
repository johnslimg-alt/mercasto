#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fixture="$(mktemp -d)"
trap 'rm -rf "$fixture"' EXIT
mkdir -p "$fixture/bin" "$fixture/backups"
cat > "$fixture/bin/pg_restore" <<'SH'
#!/usr/bin/env bash
exit 0
SH
chmod +x "$fixture/bin/pg_restore"
cat > "$fixture/bin/pg_dump" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
out=''
while (($#)); do
  if [[ "$1" == '-f' ]]; then out="$2"; shift 2; else shift; fi
done
: > "$out"
exit 1
SH
chmod +x "$fixture/bin/pg_dump"
if PATH="$fixture/bin:$PATH" BACKUP_DIR="$fixture/backups" BACKUP_ONCE=1 "$ROOT/scripts/postgres-backup-loop.sh"; then
  echo 'FAIL: failed pg_dump unexpectedly succeeded' >&2; exit 1
fi
if find "$fixture/backups" -type f -name 'backup_*.dump' | grep -q .; then
  echo 'FAIL: failed pg_dump published a final dump' >&2; exit 1
fi
cat > "$fixture/bin/pg_dump" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
out=''
while (($#)); do
  if [[ "$1" == '-f' ]]; then out="$2"; shift 2; else shift; fi
done
printf 'valid-dump-fixture' > "$out"
SH
chmod +x "$fixture/bin/pg_dump"
PATH="$fixture/bin:$PATH" BACKUP_DIR="$fixture/backups" BACKUP_ONCE=1 "$ROOT/scripts/postgres-backup-loop.sh"
count=$(find "$fixture/backups" -type f -name 'backup_*.dump' | wc -l)
[[ "$count" -eq 1 ]] || { echo "FAIL: expected one final dump, got $count" >&2; exit 1; }
find "$fixture/backups" -type f -name '*.partial.*' | grep -q . && { echo 'FAIL: partial file left behind' >&2; exit 1; }
mode=$(stat -c '%a' "$(find "$fixture/backups" -type f -name 'backup_*.dump' | head -1)")
[[ "$mode" == '640' ]] || { echo "FAIL: final dump mode=$mode" >&2; exit 1; }
echo 'postgres backup loop test OK'
