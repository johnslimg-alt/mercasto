#!/usr/bin/env bash
set -euo pipefail

controller="backend/app/Http/Controllers/Api/ProfileController.php"

if [ ! -f "$controller" ]; then
  echo "missing $controller" >&2
  exit 1
fi

python3 - <<'PY'
from pathlib import Path
import re

path = Path('backend/app/Http/Controllers/Api/ProfileController.php')
text = path.read_text()
match = re.search(r'public function deleteAccount\(Request \$request\)\s*\{(?P<body>.*?)\n    public function pushSubscribe\(', text, re.S)
if not match:
    raise SystemExit('deleteAccount method block not found')
body = match.group('body')

bad_patterns = [
    r"DB::table\('payments'\)->where\('user_id',\s*\$user->id\)->delete\(\)",
    r"DB::table\('payments'\)->whereIn\('ad_id',\s*\$adIds\)->delete\(\)",
]
for pattern in bad_patterns:
    if re.search(pattern, body):
        raise SystemExit('deleteAccount must retain payment rows by nulling user_id/ad_id, not deleting payments')

required_patterns = [
    r"DB::table\('payments'\)->where\('user_id',\s*\$user->id\)->update\(\['user_id'\s*=>\s*null\]\)",
    r"DB::table\('payments'\)->whereIn\('ad_id',\s*\$adIds\)->update\(\['ad_id'\s*=>\s*null\]\)",
]
for pattern in required_patterns:
    if not re.search(pattern, body):
        raise SystemExit('deleteAccount must null payment user_id and ad_id before deleting account/ads')

print('payment retention scan OK')
PY
