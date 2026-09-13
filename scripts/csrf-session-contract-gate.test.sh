#!/usr/bin/env bash
set -euo pipefail

# Negative control for scripts/csrf-session-contract-gate.sh.
#
# The gate asserts a bearer-auth/CSRF/session contract across the backend config,
# the routes, the OAuth exchange and the LIVE client entry. This control proves it
# can actually fail: for each half of the contract it mutates a scratch copy in a
# way that breaks the contract and requires the gate to reject it.
#
# It exists because the gate previously asserted src/contexts/AuthContext.jsx,
# which never executes in the browser (RC-3), and because a check with no control
# cannot demonstrate it is capable of failing at all (RC-4).
#
# Replacement covers ALL occurrences, not the first: src/App.jsx reads the token in
# many handlers, so mutating a single call site leaves the gate satisfied by the
# others and would prove nothing. The claim tested is "the contract is gone".
#
# The wiring half is controlled the same way, and in both directions: the entry
# must IMPORT ./App.jsx and must RENDER its component on the element index.html
# serves. Import-only mutations were not enough -- keeping the import while the
# render tree stops using the component (or while the mount is moved behind a
# condition, a function that never runs, or an element the served HTML does not
# contain) left this gate green, which is RC-3 again: a claim about reachability
# asserted by import instead of by execution. Cases that still render are kept
# alongside them, so the gate cannot drift into an exact-string match.
#
# Everything happens in a temporary directory; the repository is never modified.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GATE="scripts/csrf-session-contract-gate.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Paths the gate reads. Copied with their relative layout so the gate's own
# ROOT_DIR resolution works inside the scratch tree.
FILES=(
  "backend/bootstrap/app.php"
  "backend/config/cors.php"
  "backend/config/session.php"
  "backend/app/Http/Controllers/Api/AuthController.php"
  "backend/routes/api.php"
  "src/App.jsx"
  "src/main.jsx"
  "index.html"
)

seed() {
  rm -rf "$TMP/tree"
  mkdir -p "$TMP/tree/scripts"
  local file
  for file in "${FILES[@]}"; do
    mkdir -p "$TMP/tree/$(dirname "$file")"
    cp "$ROOT/$file" "$TMP/tree/$file"
  done
  cp "$ROOT/$GATE" "$TMP/tree/$GATE"
}

# Literal replacement via python: the contract strings contain backticks, ${} and
# quotes that make sed fragile.
mutate() {
  local file="$1" old="$2" new="$3"
  python3 - "$TMP/tree/$file" "$old" "$new" <<'PY'
import sys
path, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
text = open(path, encoding='utf-8').read()
count = text.count(old)
if count == 0:
    raise SystemExit(f'mutation target not found in {path}: {old!r}')
open(path, 'w', encoding='utf-8').write(text.replace(old, new))
PY
}

run_gate() {
  bash "$TMP/tree/$GATE" 2>&1
}

check() {
  local label="$1" expected_rc="$2"
  local out rc=0
  out="$(run_gate)" || rc=$?
  if [ "$rc" -ne "$expected_rc" ]; then
    echo "FAIL[$label]: expected rc=$expected_rc, got rc=$rc" >&2
    printf '%s\n' "$out" >&2
    exit 1
  fi
  echo "ok: $label (rc=$rc)"
}

echo "== csrf-session-contract-gate negative control =="

# --- positive control: the untouched tree must pass -------------------------
seed
check "unmutated tree passes" 0

# --- client half: the live entry must carry the bearer contract -------------
seed
mutate "src/App.jsx" "localStorage.getItem('auth_token')" "localStorage.getItem('nope_token')"
check "token read removed from the live entry" 1

seed
mutate "src/App.jsx" "'Authorization': \`Bearer \${token}\`" "'Authorization': token"
check "bearer header shape changed" 1

seed
mutate "src/App.jsx" "localStorage.setItem('auth_token'" "localStorage.setItem('nope_token'"
check "token is never stored on sign-in" 1

# Scoping: clearing the token ELSEWHERE in the file while handleLogout stops doing
# it must fail. This is the realistic partial regression the file-wide grep missed.
seed
python3 - "$TMP/tree/src/App.jsx" <<'PY'
import re, sys
path = sys.argv[1]
src = open(path, encoding='utf-8').read()
m = re.search(r'const handleLogout\b[^{]*\{', src)
assert m, 'handleLogout not found'
depth = 0
for i in range(m.end() - 1, len(src)):
    if src[i] == '{':
        depth += 1
    elif src[i] == '}':
        depth -= 1
        if depth == 0:
            body = src[m.end():i]
            assert "localStorage.removeItem('auth_token')" in body, 'expected the clear inside handleLogout'
            src = src[:m.end()] + body.replace("localStorage.removeItem('auth_token')", "localStorage.removeItem('nope_token')", 1) + src[i:]
            break
open(path, 'w', encoding='utf-8').write(src)
PY
check "handleLogout stops clearing the token (unrelated clears remain)" 1

# And removing EVERY occurrence still fails.
seed
mutate "src/App.jsx" "localStorage.removeItem('auth_token')" "localStorage.removeItem('nope_token')"
check "token is never cleared anywhere" 1

# --- entry wiring: the asserted module must be the one the browser loads ----
seed
mutate "src/main.jsx" "from './App.jsx'" "from './SomewhereElse.jsx'"
check "live entry stops importing App.jsx" 1

seed
mutate "index.html" 'src="/src/main.jsx"' 'src="/src/other.jsx"'
check "index.html stops loading the live entry" 1

# --- the contract must hold on a LIVE module, not the dead one --------------
# Guard the regression this retarget fixed: if the gate is ever pointed back at a
# module nothing imports, this fails.
if grep -qF 'AUTH_CONTEXT=' "$ROOT/$GATE"; then
  echo "FAIL: gate declares AUTH_CONTEXT again; the client assertions must target the live entry" >&2
  exit 1
fi
echo "ok: gate does not assert against src/contexts/AuthContext.jsx"

# --- backend half -----------------------------------------------------------
seed
mutate "backend/config/cors.php" "'supports_credentials' => false" "'supports_credentials' => true"
check "cookie credentials re-enabled in CORS" 1

seed
mutate "backend/config/session.php" "'http_only' => env('SESSION_HTTP_ONLY', true)" "'http_only' => false"
check "session cookie loses http_only" 1

seed
mutate "backend/bootstrap/app.php" "<?php" "<?php\n// \$middleware->statefulApi();"
check "stateful cookie auth enabled in bootstrap" 1

seed
mutate "backend/routes/api.php" "Route::middleware('auth:sanctum')->group" "Route::middleware('web')->group"
check "protected routes drop auth:sanctum" 1

seed
mutate "backend/app/Http/Controllers/Api/AuthController.php" "Cache::put('oauth_exchange:'" "Cache::put('oauth_plain:'"
check "OAuth one-time exchange code removed" 1

# --- remaining backend assertions -------------------------------------------
seed
mutate "backend/config/cors.php" "'allowed_origins' => [\$frontendOrigin]" "'allowed_origins' => ['*']"
check "CORS allowed_origins widened to a wildcard" 1

seed
mutate "backend/config/session.php" "'same_site' => env('SESSION_SAME_SITE', 'lax')" "'same_site' => 'none'"
check "session cookie same_site weakened" 1

seed
mutate "backend/app/Http/Controllers/Api/AuthController.php" "'oauth_code' => \$exchangeCode" "'access_token' => \$user->createToken('x')->plainTextToken"
check "OAuth callback returns a raw token instead of a one-time code" 1

seed
python3 - "$TMP/tree/backend/app/Http/Controllers/Api/AuthController.php" <<'PY'
import sys
path = sys.argv[1]
src = open(path, encoding='utf-8').read()
src += "\n// negative control: a redirect carrying a raw bearer token\n"
src += "function _bad_redirect($access_token) { return redirect('/x?access_token=' . $access_token); }\n"
open(path, 'w', encoding='utf-8').write(src)
PY
check "raw bearer token placed in a redirect URL" 1

# --- wiring must be ACTIVE, not merely present ------------------------------
seed
python3 - "$TMP/tree/index.html" <<'PY'
import sys
path = sys.argv[1]
src = open(path, encoding='utf-8').read()
src = src.replace('<script type="module" src="/src/main.jsx"></script>',
                  '<!-- <script type="module" src="/src/main.jsx"></script> -->\n<script type="module" src="/src/other.jsx"></script>', 1)
open(path, 'w', encoding='utf-8').write(src)
PY
check "index.html comments out the live entry and loads a replacement" 1

seed
python3 - "$TMP/tree/src/main.jsx" <<'PY'
import sys
path = sys.argv[1]
src = open(path, encoding='utf-8').read()
src = src.replace("import AppWrapper from './App.jsx'", "// import AppWrapper from './App.jsx'\nimport AppWrapper from './Other.jsx'", 1)
open(path, 'w', encoding='utf-8').write(src)
PY
check "main.jsx comments out the App.jsx import" 1

# --- importing the module is not the same claim as MOUNTING it ---------------
# RC-3 on the client wire: an entry-point migration can keep the active import
# while the render tree stops using the component. Every token-lifecycle
# assertion above then describes code the browser never executes -- and lint does
# not catch it, because `no-unused-vars` is configured with
# `varsIgnorePattern: '^[A-Z_]'`, which exempts an unused `AppWrapper` import.
# Each case below was verified to leave the gate green before this was added.
seed
mutate "src/main.jsx" "<AppWrapper />" "<SomethingElse />"
check "entry imports App.jsx but renders a different component" 1

seed
mutate "src/main.jsx" "<AppWrapper />" "{/* <AppWrapper /> */}"
check "AppWrapper is commented out of the render tree" 1

seed
mutate "src/main.jsx" "<AppWrapper />" "{false && <AppWrapper />}"
check "AppWrapper sits behind a condition that is never true" 1

seed
mutate "src/main.jsx" "getElementById('root')" "getElementById('app')"
check "entry mounts on an element index.html does not serve" 1

seed
mutate "index.html" 'id="root"' 'id="app"'
check "index.html stops serving the mount element" 1

seed
mutate "src/main.jsx" "if (rootElement) {" "if (false) {"
check "the mount is gated behind a condition that is never true" 1

seed
mutate "src/main.jsx" "if (rootElement) {" "if (!rootElement) {"
check "the mount guard is inverted" 1

seed
mutate "src/main.jsx" "createRoot(rootElement)" "createRoot(document.createElement('div'))"
check "the mount is pointed at a detached element" 1

# The mount moved into a function that is never called: the render still exists as
# text in the module, but nothing executes it.
seed
python3 - "$TMP/tree/src/main.jsx" <<'PY'
import sys
path = sys.argv[1]
src = open(path, encoding='utf-8').read()
old = "if (rootElement) {\n  createRoot(rootElement).render("
assert old in src, 'mount guard not found'
src = src.replace(old, "function mountApp() {\n  createRoot(rootElement).render(", 1)
open(path, 'w', encoding='utf-8').write(src)
PY
check "the mount is moved into a function that is never called" 1

# The mount statement removed entirely (import and token lifecycle untouched).
seed
python3 - "$TMP/tree/src/main.jsx" <<'PY'
import sys
path = sys.argv[1]
src = open(path, encoding='utf-8').read()
assert 'createRoot(rootElement).render(' in src, 'mount not found'
src = src.replace('createRoot(rootElement).render(', '// createRoot(rootElement).render(', 1)
open(path, 'w', encoding='utf-8').write(src)
PY
check "the mount call is commented out entirely" 1

# The realistic migration: render a different component that IS imported and
# defined, so neither the build nor lint has anything to complain about.
seed
python3 - "$TMP/tree/src/main.jsx" <<'PY'
import sys
path = sys.argv[1]
src = open(path, encoding='utf-8').read()
src = src.replace("import AppWrapper from './App.jsx'",
                  "import AppWrapper from './App.jsx'\nimport MigratedApp from './MigratedApp.jsx'", 1)
assert '<AppWrapper />' in src
src = src.replace('<AppWrapper />', '<MigratedApp />', 1)
open(path, 'w', encoding='utf-8').write(src)
PY
check "entry renders a migrated replacement component instead" 1

# The component is used in the module, but OUTSIDE the render tree: the text
# exists and the file would still lint, yet nothing mounts it. The assertion must
# be about the render tree, not about the file.
seed
python3 - "$TMP/tree/src/main.jsx" <<'PY'
import sys
path = sys.argv[1]
src = open(path, encoding='utf-8').read()
src = src.replace("import AppWrapper from './App.jsx'",
                  "import AppWrapper from './App.jsx'\nimport MigratedApp from './MigratedApp.jsx'", 1)
assert '<AppWrapper />' in src
src = src.replace('<AppWrapper />', '<MigratedApp />', 1)
marker = "const rootElement = document.getElementById('root');"
assert marker in src
src = src.replace(marker, "const renderedButUnmounted = <AppWrapper />;\n" + marker, 1)
open(path, 'w', encoding='utf-8').write(src)
PY
check "AppWrapper is used in the module but not in the render tree" 1

# The gate must stay structural, not name- or quote-brittle: shapes that still
# render the component on the served element have to pass, or the control would
# be locking in an exact-string match instead of the contract.
seed
mutate "src/main.jsx" "import AppWrapper from './App.jsx'" 'import AppWrapper from "./App.jsx"'
check "the same wiring with double quotes still passes" 0

seed
mutate "src/main.jsx" "import AppWrapper from './App.jsx'" "import { default as AppWrapper } from './App.jsx'"
check "the same wiring via a named default import still passes" 0

seed
python3 - "$TMP/tree/src/main.jsx" "$TMP/tree/index.html" <<'PY'
import sys
main_path, index_path = sys.argv[1], sys.argv[2]
main_src = open(main_path, encoding='utf-8').read()
assert "getElementById('root')" in main_src
open(main_path, 'w', encoding='utf-8').write(main_src.replace("getElementById('root')", "getElementById('app')", 1))
index_src = open(index_path, encoding='utf-8').read()
assert 'id="root"' in index_src
open(index_path, 'w', encoding='utf-8').write(index_src.replace('id="root"', 'id="app"', 1))
PY
check "a consistently renamed mount element still passes" 0

# A different lookup (a portal or modal root) inserted before the mount must not
# be mistaken for the mount element: the gate resolves the element the mount
# actually uses, not the first one in the file.
seed
python3 - "$TMP/tree/src/main.jsx" <<'PY'
import sys
path = sys.argv[1]
src = open(path, encoding='utf-8').read()
marker = "const rootElement = document.getElementById('root');"
assert marker in src
src = src.replace(marker, "const portalRoot = document.getElementById('portal');\n" + marker, 1)
open(path, 'w', encoding='utf-8').write(src)
PY
check "an unrelated element lookup before the mount still passes" 0

echo "csrf-session-contract-gate negative control OK"
