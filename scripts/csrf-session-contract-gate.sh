#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BOOTSTRAP="backend/bootstrap/app.php"
CORS="backend/config/cors.php"
SESSION="backend/config/session.php"
AUTH_CONTROLLER="backend/app/Http/Controllers/Api/AuthController.php"
ROUTES="backend/routes/api.php"

# The client half of this contract must be asserted where it EXECUTES.
#
# This gate used to grep src/contexts/AuthContext.jsx. That file never runs in the
# browser: it is imported only by src/contexts/AppProviders.jsx, which nothing
# imports, and `useAuth` has no consumers anywhere. So the gate was asserting a
# CSRF/session contract inside dead code -- the same "green check about the wrong
# artifact" class that hid the catalog P0 (retrospective-2, RC-3; D-054 family).
#
# The live session surface is src/App.jsx, the module the browser actually loads:
#   index.html -> /src/main.jsx -> ./App.jsx
# Every assertion below is satisfied by the executing app, and the wiring that
# makes that true is asserted too, so these checks cannot silently drift back onto
# a module nobody runs. scripts/gate-integrity-check.mjs enforces the same property
# mechanically with `asserted-orphan`.
APP="src/App.jsx"
MAIN="src/main.jsx"
INDEX="index.html"

echo "== Bearer auth and CSRF/session contract gate =="

for file in "$BOOTSTRAP" "$CORS" "$SESSION" "$APP" "$MAIN" "$INDEX" "$AUTH_CONTROLLER" "$ROUTES"; do
  test -f "$file"
done

# The asserted module must be the one the browser executes. If the entry wiring
# changes, the client assertions below stop describing the running app and this
# gate would go back to certifying something that never loads.
grep -qF 'src="/src/main.jsx"' "$INDEX"
grep -qF "from './App.jsx'" "$MAIN"

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
grep -qF "Route::middleware('auth:sanctum')->group" "$ROUTES"

# Client contract, asserted against the live entry. The token is read from
# localStorage and presented as a bearer header -- no cookies, no ambient
# credentials, which is what makes `supports_credentials => false` correct.
grep -qF "localStorage.getItem('auth_token')" "$APP"
grep -qF "'Authorization': \`Bearer \${token}\`" "$APP"

# Strengthened in the retarget: the read path alone does not make a session
# contract. The token must also be stored on sign-in and cleared on sign-out, or
# "bearer-only" describes a token that is either never issued or never revoked.
# Neither of these was asserted before, because the dead file they used to be
# checked in does not hold the client's token lifecycle.
grep -qF "localStorage.setItem('auth_token'" "$APP"
grep -qF "localStorage.removeItem('auth_token')" "$APP"

# OAuth callbacks must exchange a short-lived one-time code instead of placing a
# long-lived personal access token in the redirect URL.
grep -qF "Cache::put('oauth_exchange:'" "$AUTH_CONTROLLER"
grep -qF "'oauth_code' => \$exchangeCode" "$AUTH_CONTROLLER"
if grep -Eq "redirect.*(access_token|plainTextToken)" "$AUTH_CONTROLLER"; then
  echo "raw bearer token appears to be redirected through a URL" >&2
  exit 1
fi

echo "bearer auth and CSRF/session contract gate OK"
