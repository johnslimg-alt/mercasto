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
#
# Comments are stripped first. A fixed-string grep is satisfied by a commented-out
# tag or import -- `<!-- <script src="/src/main.jsx"> -->` during an entry-point
# migration would keep this gate green while the browser executed something else.
# That is the same "claim satisfied by inactive text" defect as the commented
# import in the checker's reachability graph and the impossible pipeline in the
# dashboard gate, so it is handled the same way: look at what is active, not at
# what the file contains.
if ! python3 - "$INDEX" "$MAIN" <<'PY'
import re
import sys

index_html = open(sys.argv[1], encoding='utf-8').read()
main_jsx = open(sys.argv[2], encoding='utf-8').read()

# HTML comments can span lines; JS block comments likewise. Whole-line `//`
# comments are removed line by line (a `//` inside a URL literal is not at line
# start, so it survives).
index_active = re.sub(r'<!--.*?-->', '', index_html, flags=re.S)
main_active = re.sub(r'/\*.*?\*/', '', main_jsx, flags=re.S)
main_active = re.sub(r'^[ \t]*//.*$', '', main_active, flags=re.M)

loads_entry = re.search(r'<script[^>]*\bsrc=["\']/src/main\.jsx["\']', index_active)
imports_app = re.search(r'\bfrom\s+["\']\./App\.jsx["\']', main_active)
sys.exit(0 if (loads_entry and imports_app) else 1)
PY
then
  echo "index.html must actively load /src/main.jsx and main.jsx must actively import ./App.jsx" >&2
  echo "(a commented-out tag or import does not count as wiring)" >&2
  exit 1
fi

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

# Sign-out is asserted INSIDE the sign-out handler, not merely somewhere in the
# file. `removeItem('auth_token')` also appears in `resetSessionAndReload()` and in
# the 401 recovery path, so a file-wide grep stayed green if `handleLogout` stopped
# clearing the token -- the check would have been satisfied by code that runs on a
# stale-build reload or an expired session, not on sign-out.
#
# Known limit, stated rather than hidden: there is no equivalent scoping for the
# sign-in half. The token is stored in several distinct flows (email/password,
# phone, two-step, OAuth exchange, magic-link) at more than one call site each, so
# pinning any single one would be arbitrary; proving every flow stores the token
# needs a behavioural test that drives each flow, not a grep. What is asserted
# here is presence, not per-flow coverage.
if ! python3 - "$APP" handleLogout "localStorage.removeItem('auth_token')" <<'PY'
import re
import sys

source = open(sys.argv[1], encoding='utf-8').read()
name, needle = sys.argv[2], sys.argv[3]

# Find the handler, then brace-match its body. Template `${...}` and object
# literals keep braces balanced, so a depth count finds the real end.
match = re.search(r'(?:const|let|var|async function|function)\s+' + re.escape(name) + r'\b[^{]*\{', source)
if not match:
    sys.exit(1)

depth = 0
for i in range(match.end() - 1, len(source)):
    if source[i] == '{':
        depth += 1
    elif source[i] == '}':
        depth -= 1
        if depth == 0:
            sys.exit(0 if needle in source[match.end():i] else 1)
sys.exit(1)
PY
then
  echo "handleLogout must clear auth_token in its own body, not only elsewhere in the file" >&2
  exit 1
fi

# OAuth callbacks must exchange a short-lived one-time code instead of placing a
# long-lived personal access token in the redirect URL.
grep -qF "Cache::put('oauth_exchange:'" "$AUTH_CONTROLLER"
grep -qF "'oauth_code' => \$exchangeCode" "$AUTH_CONTROLLER"
if grep -Eq "redirect.*(access_token|plainTextToken)" "$AUTH_CONTROLLER"; then
  echo "raw bearer token appears to be redirected through a URL" >&2
  exit 1
fi

echo "bearer auth and CSRF/session contract gate OK"
