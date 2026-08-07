#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DB_CONTAINER="${SCHEMA_DRIFT_DB_CONTAINER:-mercasto_db_container}"
KNOWN_FILE="ops/schema/known-unmanaged-production-tables.txt"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "== Production schema drift smoke =="
test -x scripts/schema-migration-inventory.py
test -f "$KNOWN_FILE"

scripts/schema-migration-inventory.py > "$TMP_DIR/managed"
printf '%s\n' migrations >> "$TMP_DIR/managed"
sort -u -o "$TMP_DIR/managed" "$TMP_DIR/managed"
grep -Ev '^[[:space:]]*(#|$)' "$KNOWN_FILE" | sort -u > "$TMP_DIR/known"

docker exec "$DB_CONTAINER" sh -lc 'psql -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT tablename FROM pg_tables WHERE schemaname='\''public'\'' ORDER BY tablename"' > "$TMP_DIR/live"
sort -u -o "$TMP_DIR/live" "$TMP_DIR/live"
cat "$TMP_DIR/managed" "$TMP_DIR/known" | sort -u > "$TMP_DIR/allowed"

comm -23 "$TMP_DIR/live" "$TMP_DIR/allowed" > "$TMP_DIR/unexpected"
comm -23 "$TMP_DIR/managed" "$TMP_DIR/live" > "$TMP_DIR/missing_managed"
comm -23 "$TMP_DIR/known" "$TMP_DIR/live" > "$TMP_DIR/missing_known"
comm -12 "$TMP_DIR/managed" "$TMP_DIR/known" > "$TMP_DIR/managed_and_known"

failed=0
for item in unexpected missing_managed missing_known managed_and_known; do
  if [[ -s "$TMP_DIR/$item" ]]; then
    echo "FAIL: schema drift set $item:" >&2
    sed 's/^/  - /' "$TMP_DIR/$item" >&2
    failed=1
  fi
done
(( failed == 0 )) || exit 1

echo "managed_tables=$(wc -l < "$TMP_DIR/managed" | tr -d ' ')"
echo "known_unmanaged_tables=$(wc -l < "$TMP_DIR/known" | tr -d ' ')"
echo "live_public_tables=$(wc -l < "$TMP_DIR/live" | tr -d ' ')"
echo "production schema drift smoke OK"
