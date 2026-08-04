#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BOOTSTRAP="backend/bootstrap/app.php"
CORS="backend/config/cors.php"
SESSION="backend/config/session.php"
AUTH_CONTEXT="src/contexts/AuthContext.jsx"
AUTH_CONTROLLER="backend/app/Http/Controllers/Api/AuthController.php"
ROUTES="backend/routes/api.php"

echo "== Bearer auth and CSRF/session contract gate =="

for file in "$BOOTSTRAP" "$CORS" "$SESSION" "$AUTH_CONTEXT" "$AUTH_CONTROLLER" "$ROUTES"; do
  test -f "$file"
done

# API authentication is intentionally bearer-only. A future cookie-auth migration
# must explicitly replace this gate and add stateful Sanctum + CSRF coverage together.
if grep -Eq 'statefulApi\(|EnsureFrontendRequestsAreStateful' "$BOOTSTRAP"; then
  echo "stateful cookie authentication detected without an approved contract migration" >&2
  exit 1
fi

grep -qF "'supports_credentials' => false" "$CORS"
grep -qF "'allowed_origins' => [\$frontendOrigin]" "$CORS"
grep -qF "'http_only' => env('SESSION_HTTP_ONLY', true)" "$SESSION"
grep -qF "'same_site' => env('SESSION_SAME_SITE', 'lax')" "$SESSION"
grep -qF "localStorage.getItem('auth_token')" "$AUTH_CONTEXT"
grep -qF "'Authorization': \`Bearer \${token}\`" "$AUTH_CONTEXT"
grep -qF "Route::middleware('auth:sanctum')->group" "$ROUTES"

# OAuth callbacks must exchange a short-lived one-time code instead of placing a
# long-lived personal access token in the redirect URL.
grep -qF "Cache::put('oauth_exchange:'" "$AUTH_CONTROLLER"
grep -qF "'oauth_code' => \$exchangeCode" "$AUTH_CONTROLLER"
if grep -Eq "redirect.*(access_token|plainTextToken)" "$AUTH_CONTROLLER"; then
  echo "raw bearer token appears to be redirected through a URL" >&2
  exit 1
fi

echo "bearer auth and CSRF/session contract gate OK"
