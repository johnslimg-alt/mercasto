#!/usr/bin/env bash
set -euo pipefail

route_file="backend/bootstrap/app.php"
controller="backend/app/Http/Controllers/Api/AccountDeletionController.php"
legacy_controller="backend/app/Http/Controllers/Api/ProfileController.php"

if [ ! -f "$route_file" ]; then
  echo "missing $route_file" >&2
  exit 1
fi

if [ ! -f "$controller" ]; then
  echo "missing $controller" >&2
  exit 1
fi

python3 - <<'PY'
from pathlib import Path
import re

route_text = Path('backend/bootstrap/app.php').read_text()
if 'AccountDeletionController::class' not in route_text or "delete('/api/user'" not in route_text:
    raise SystemExit('active /api/user delete route must use AccountDeletionController')

text = Path('backend/app/Http/Controllers/Api/AccountDeletionController.php').read_text()
match = re.search(r'public function delete\(Request \$request\)\s*\{(?P<body>.*)\n    \}', text, re.S)
if not match:
    raise SystemExit('AccountDeletionController::delete method block not found')
body = match.group('body')

bad_patterns = [
    r"DB::table\('payments'\)->where\('user_id',\s*\$user->id\)->delete\(\)",
    r"DB::table\('payments'\)->whereIn\('ad_id',\s*\$adIds\)->delete\(\)",
]
for pattern in bad_patterns:
    if re.search(pattern, body):
        raise SystemExit('self-delete must retain payment rows by nulling user_id/ad_id, not deleting payments')

required_patterns = [
    r"DB::table\('payments'\)->where\('user_id',\s*\$user->id\)->update\(\['user_id'\s*=>\s*null\]\)",
    r"DB::table\('payments'\)->whereIn\('ad_id',\s*\$adIds\)->update\(\['ad_id'\s*=>\s*null\]\)",
]
for pattern in required_patterns:
    if not re.search(pattern, body):
        raise SystemExit('self-delete must null payment user_id and ad_id before deleting account/ads')

# Legacy ProfileController::deleteAccount can remain until a larger refactor removes it,
# but it must no longer be the active /api/user delete route.
legacy = Path('backend/app/Http/Controllers/Api/ProfileController.php')
if legacy.exists():
    legacy_text = legacy.read_text()
    if "Route::delete('/user', [ProfileController::class, 'deleteAccount'])" in legacy_text:
        raise SystemExit('unexpected route definition in legacy ProfileController')

print('payment retention scan OK')
PY
