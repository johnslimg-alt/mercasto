#!/usr/bin/env bash
set -euo pipefail

WAITLIST_CONTROLLER="backend/app/Http/Controllers/AdminWaitlistController.php"
BACKUP_COMMAND="backend/app/Console/Commands/BackupDatabase.php"
BACKUP_TEST="backend/tests/Feature/BackupDatabaseCommandSafetyTest.php"

echo "== Legacy secret fallback gate =="

test ! -e "$WAITLIST_CONTROLLER"
test -f "$BACKUP_COMMAND"
test -f "$BACKUP_TEST"

grep -qF "config('database.connections.pgsql'" "$BACKUP_COMMAND"
grep -qF 'refusing to run a backup' "$BACKUP_COMMAND"
grep -qF 'return self::FAILURE;' "$BACKUP_COMMAND"
grep -qF "config(['database.connections.pgsql.password' => null])" "$BACKUP_TEST"
grep -qF -- '->assertFailed();' "$BACKUP_TEST"

if grep -RInE --include='*.php' "env\(['\"]ADMIN_SECRET['\"],[[:space:]]*['\"][^'\"]+['\"]|env\(['\"]DB_PASSWORD['\"],[[:space:]]*['\"][^'\"]+['\"]" backend/app; then
  echo "FAIL: secret-like application env fallback returned" >&2
  exit 1
fi

if grep -RInE --include='*.php' 'X-Admin-Secret|query\(['\''"]secret['\''"]\)' backend/app; then
  echo "FAIL: legacy shared-secret admin surface returned" >&2
  exit 1
fi

echo "legacy secret fallback gate OK"
