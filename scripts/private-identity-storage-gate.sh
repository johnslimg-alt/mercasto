#!/usr/bin/env bash
set -euo pipefail

USER_MODEL="backend/app/Models/User.php"
PROFILE="backend/app/Http/Controllers/Api/ProfileController.php"
BUSINESS="backend/app/Http/Controllers/Api/BusinessProfileController.php"
ROUTES="backend/routes/api.php"

echo "== Private identity storage gate =="
grep -qF "'kyc_document_url'," "$USER_MODEL"
grep -qF "'business_csf_url'," "$USER_MODEL"
grep -qF -- "->file('document')->store('kyc_documents')" "$PROFILE"
grep -qF "Storage::disk('local')->put" "$BUSINESS"
grep -qF "Storage::download(\$user->kyc_document_url)" "$PROFILE"
grep -qF "Storage::disk('local')->download(\$user->business_csf_url" "$BUSINESS"
grep -qF "Route::get('/admin/kyc/document/{id}'" "$ROUTES"
grep -qF "Route::get('/admin/business-verifications/{userId}/csf'" "$ROUTES"
python3 - "$USER_MODEL" <<'PY'
import re, sys
from pathlib import Path
s=Path(sys.argv[1]).read_text()
m=re.search(r'protected \$hidden\s*=\s*\[(.*?)\];', s, re.S)
if not m: raise SystemExit('hidden array not found')
block=m.group(1)
for key in ('kyc_document_url','business_csf_url'):
    if f"'{key}'" not in block:
        raise SystemExit(f'{key} not hidden')
PY
echo "private identity storage gate OK"
