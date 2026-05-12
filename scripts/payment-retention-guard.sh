#!/usr/bin/env bash
set -euo pipefail

file="backend/app/Http/Controllers/Api/ProfileController.php"

if [ ! -f "$file" ]; then
  echo "missing $file" >&2
  exit 1
fi

# Extract only the self-service deleteAccount method. The guard is intentionally
# conservative: admin destroy() may contain retention-safe payment handling, but
# self-delete must not physically delete payment rows.
method_body=$(awk '
  /public function deleteAccount\(Request \$request\)/ {capture=1}
  capture {print}
  capture && /^    public function pushSubscribe\(Request \$request\)/ {exit}
' "$file")

if [ -z "$method_body" ]; then
  echo "deleteAccount method not found" >&2
  exit 1
fi

if printf '%s\n' "$method_body" | grep -Eq "DB::table\('payments'\)->where\('user_id'[^;]*->delete\(\)"; then
  echo "deleteAccount physically deletes payments by user_id; expected retention-safe nulling" >&2
  exit 1
fi

if printf '%s\n' "$method_body" | grep -Eq "DB::table\('payments'\)->whereIn\('ad_id'[^;]*->delete\(\)"; then
  echo "deleteAccount physically deletes payments by ad_id; expected retention-safe nulling" >&2
  exit 1
fi

if ! printf '%s\n' "$method_body" | grep -Eq "DB::table\('payments'\)->where\('user_id'[^;]*->update\(\['user_id' => null\]\)"; then
  echo "deleteAccount does not null payments.user_id" >&2
  exit 1
fi

if ! printf '%s\n' "$method_body" | grep -Eq "DB::table\('payments'\)->whereIn\('ad_id'[^;]*->update\(\['ad_id' => null\]\)"; then
  echo "deleteAccount does not null payments.ad_id" >&2
  exit 1
fi

echo "payment retention guard OK"
