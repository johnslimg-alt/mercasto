#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MIDDLEWARE="backend/app/Http/Middleware/RejectUnsafeXmlUpload.php"
BOOTSTRAP="backend/bootstrap/app.php"
TEST="backend/tests/Feature/RejectUnsafeXmlUploadTest.php"

echo "== XML upload security gate =="

test -f "$MIDDLEWARE"
test -f "$BOOTSTRAP"
test -f "$TEST"

grep -qF "request->is('api/ads/bulk-upload')" "$MIDDLEWARE"
grep -qF "stripos(\$window, '<!DOCTYPE')" "$MIDDLEWARE"
grep -qF "stripos(\$window, '<!ENTITY')" "$MIDDLEWARE"
grep -qF "HTTP_UNPROCESSABLE_ENTITY" "$MIDDLEWARE"
grep -qF "RejectUnsafeXmlUpload::class" "$BOOTSTRAP"
grep -qF "test_it_rejects_doctype_and_entity_declarations_for_bulk_uploads" "$TEST"
grep -qF "test_it_allows_regular_bulk_xml" "$TEST"

echo "XML upload security gate OK"
