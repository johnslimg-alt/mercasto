#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

AUDIT="backend/app/Support/SecurityAudit.php"
MIDDLEWARE="backend/app/Http/Middleware/SecurityAuditMiddleware.php"
BOOTSTRAP="backend/bootstrap/app.php"
LOGGING="backend/config/logging.php"
TEST="backend/tests/Feature/SecurityAuditTest.php"
SCAN="scripts/repository-sensitive-artifact-scan.sh"
DOC="docs/security/SECURITY_AUDIT_LOGGING.md"

echo "== Security audit logging gate =="

for file in "$AUDIT" "$MIDDLEWARE" "$BOOTSTRAP" "$LOGGING" "$TEST" "$SCAN" "$DOC"; do
  test -f "$file"
done

grep -qF "Log::channel('security')->warning" "$AUDIT"
grep -qF "'ip_hash' => self::fingerprint" "$AUDIT"
grep -qF "'email_hash'" "$AUDIT"
grep -qF "public function terminate" "$MIDDLEWARE"
grep -qF "prependToGroup('api', \\App\\Http\\Middleware\\SecurityAuditMiddleware::class)" "$BOOTSTRAP"
grep -qF "'path' => storage_path('logs/security.log')" "$LOGGING"
grep -qF "'days' => env('SECURITY_LOG_DAYS', 30)" "$LOGGING"
grep -qF "'permission' => 0640" "$LOGGING"

for event in auth_rejected authorization_denied upload_rejected webhook_rejected rate_limited authentication_required; do
  grep -qF "'$event'" "$AUDIT"
  grep -qF "'$event'" "$TEST"
done

python3 - "$AUDIT" "$MIDDLEWARE" <<'PY'
from pathlib import Path
import sys

for filename in sys.argv[1:]:
    text = Path(filename).read_text()
    forbidden = [
        'request->all(', 'request()->all(', 'bearerToken(',
        "input('password')", 'headers->all(', 'cookies->all(',
        'userAgent()', "'password' =>", "'token' =>", "'authorization' =>",
    ]
    for marker in forbidden:
        if marker in text:
            raise SystemExit(f'unsafe security audit field access in {filename}: {marker}')
PY

grep -qF -- "-name '*.bak'" "$SCAN"
grep -qF -- "-path './backend/storage' -prune" "$SCAN"
grep -qF 'Raw request bodies are never recorded' "$DOC"

probe='.security-artifact-probe.bak'
trap 'rm -f -- "$probe"' EXIT
touch "$probe"
if bash "$SCAN" >/dev/null 2>&1; then
  echo "untracked backup artifact probe was not detected" >&2
  exit 1
fi
rm -f -- "$probe"
trap - EXIT
bash "$SCAN" >/dev/null

echo "security audit logging gate OK"
