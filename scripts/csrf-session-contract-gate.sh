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
#
# Importing the module is NOT the contract; RENDERING its component is. Keeping
# `import AppWrapper from './App.jsx'` while replacing `<AppWrapper />` in the
# render tree leaves every token-lifecycle assertion below describing code the
# browser never runs, and the gate used to stay green through exactly that
# (RC-3: asserting reachability by import instead of by execution). ESLint does
# not catch it either: `no-unused-vars` runs with `varsIgnorePattern: '^[A-Z_]'`
# (eslint.config.js), which exempts an unused `AppWrapper` import, so the import
# can be dead and lint still reports nothing. The gate therefore proves the
# render itself:
#   1. main.jsx default-imports ./App.jsx, and the component binding is taken
#      FROM that import rather than assuming a name;
#   2. the binding is used as a JSX element inside the render-tree argument of an
#      active `createRoot(<element>).render(...)` call, not behind a conditional;
#   3. the mount target is the element index.html actually serves, and the mount
#      is not wrapped in a function/arrow body or gated behind a condition that
#      cannot be true (`if (false)`, `if (!rootElement)`, ...).
# These forms are checked structurally. A mount this gate cannot prove executes
# fails closed rather than being certified: if the entry point is refactored into
# a shape the analysis does not recognise, update the gate deliberately instead
# of letting it certify code it can no longer see.
#
# Known limit, stated rather than hidden: the "not behind a conditional" check is
# local to the component's own JSX occurrence. A condition wrapping an ANCESTOR
# element in the render tree (`{ready ? <Shell><AppWrapper /></Shell> : null}`) is
# not modelled, because deciding that from text needs real JSX evaluation. The
# control covers the direct forms; closing the residual one needs a behavioural
# mount test, not a larger regex.
if ! python3 - "$INDEX" "$MAIN" <<'PY'
import re
import sys

index_path, main_path = sys.argv[1], sys.argv[2]
index_html = open(index_path, encoding='utf-8').read()
main_jsx = open(main_path, encoding='utf-8').read()


def fail(reason):
    print(reason, file=sys.stderr)
    sys.exit(1)


# HTML comments can span lines; JS block comments likewise. Whole-line `//`
# comments are removed line by line (a `//` inside a URL literal is not at line
# start, so it survives). JSX `{/* ... */}` comments are block comments, so a
# commented-out `<AppWrapper />` is removed here too.
index_active = re.sub(r'<!--.*?-->', '', index_html, flags=re.S)
main_active = re.sub(r'/\*.*?\*/', '', main_jsx, flags=re.S)
main_active = re.sub(r'^[ \t]*//.*$', '', main_active, flags=re.M)


def close_of(text, open_pos):
    """Index just past the paren closing the one at open_pos, or -1."""
    depth = 0
    for i in range(open_pos, len(text)):
        if text[i] == '(':
            depth += 1
        elif text[i] == ')':
            depth -= 1
            if depth == 0:
                return i + 1
    return -1


def element_use(needle, tree):
    """The `<Binding` JSX-element occurrence in tree, or None."""
    return re.search(r'<' + re.escape(needle) + r'[\s/>]', tree)


# --- 1. index.html must ACTIVELY load the asserted entry ---------------------
if not re.search(r'<script[^>]*\bsrc=["\']/src/main\.jsx["\']', index_active):
    fail('index.html must actively load /src/main.jsx (a commented-out tag does not count as wiring)')

# --- 2. main.jsx must ACTIVELY default-import ./App.jsx ----------------------
# The binding comes from the import clause, so the render check below cannot be
# satisfied by an unrelated identifier that happens to share a name.
bindings = []
for match in re.finditer(r'\bimport\s+(.+?)\s+from\s+(["\'])([^"\']+)\2', main_active, flags=re.S):
    if match.group(3) != './App.jsx':
        continue
    clause = match.group(1).strip()
    if not clause.startswith('{'):
        default = re.match(r'([A-Za-z_$][\w$]*)', clause)
        if default:
            bindings.append(default.group(1))
    named = re.search(r'\bdefault\s+as\s+([A-Za-z_$][\w$]*)', clause)
    if named:
        bindings.append(named.group(1))

if not bindings:
    fail('main.jsx must actively import the default export of ./App.jsx '
         '(a commented-out import, a side-effect-only import, or a namespace import does not count as wiring)')

# --- 3. the mount element must be one index.html actually serves -------------
# Every `document.getElementById(<id>)` binding is collected, and the mount below
# is resolved against the one it actually uses. Taking "the first lookup in the
# file" would break on an unrelated lookup (a portal or modal root) added before
# the mount, and a gate that fails on correct code is a gate someone weakens.
element_statements = [
    {'var': match.group(1), 'id': match.group(3), 'end': match.end()}
    for match in re.finditer(
        r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*document\.getElementById\(\s*(["\'])([^"\']+)\2\s*\)',
        main_active)
]
if not element_statements:
    fail('main.jsx must resolve its mount element with document.getElementById(<id>) so the gate can '
         'relate the render to the element index.html serves')


def served_by_index(element_id):
    return re.search(r'\bid\s*=\s*["\']' + re.escape(element_id) + r'["\']', index_active)


# --- 4. locate the live mount: createRoot(<element>).render(<tree>) ----------
mounts = []
for match in re.finditer(r'\bcreateRoot\s*\(', main_active):
    root_open = match.end() - 1
    root_end = close_of(main_active, root_open)
    if root_end < 0:
        continue
    rendered = re.match(r'\s*\.\s*render\s*\(', main_active[root_end:])
    if not rendered:
        continue
    tree_open = root_end + rendered.end() - 1
    tree_end = close_of(main_active, tree_open)
    if tree_end < 0:
        continue
    mounts.append({
        'root_arg': main_active[root_open + 1:root_end - 1],
        'tree': main_active[tree_open + 1:tree_end - 1],
        'at': match.start(),
    })

if not mounts:
    fail('main.jsx must mount the app with createRoot(<element index.html serves>).render(<App />)')


def mount_problems(mount):
    problems = []

    rendered_bindings = [b for b in bindings if element_use(b, mount['tree'])]
    if not rendered_bindings:
        problems.append('the render tree does not use the ./App.jsx component as a JSX element '
                        '(imported binding(s): %s), so importing it proves nothing about what runs'
                        % ', '.join(bindings))
        return problems

    for binding in rendered_bindings:
        before = mount['tree'][:element_use(binding, mount['tree']).start()].rstrip()
        if before.endswith('&&') or before.endswith('||') or (before.endswith('?') and not before.endswith('?.')):
            problems.append('<%s /> sits behind a conditional in the render tree, so it may never be '
                            'mounted' % binding)

    root_arg = mount['root_arg'].strip()
    direct = re.fullmatch(r'document\.getElementById\(\s*(["\'])([^"\']+)\1\s*\)', root_arg)
    if direct:
        statement = next((s for s in element_statements if s['id'] == direct.group(2)), None)
    elif re.fullmatch(r'[A-Za-z_$][\w$]*', root_arg):
        statement = next((s for s in element_statements if s['var'] == root_arg), None)
    else:
        problems.append('createRoot() mounts on `%s`, which is not an element index.html serves'
                        % root_arg[:60])
        return problems

    if statement is None:
        problems.append('createRoot() mounts on `%s`, which main.jsx does not resolve from '
                        'document.getElementById(<id>), so the mount has no served element' % root_arg[:60])
        return problems

    element_var, element_id = statement['var'], statement['id']
    if not served_by_index(element_id):
        problems.append('index.html must actively serve an element with id="%s": the entry mounts on #%s, '
                        'which the served HTML does not contain, so nothing renders' % (element_id, element_id))
        return problems

    between = main_active[statement['end']:mount['at']]
    if re.search(r'\bfunction\b|=>|\bclass\b', between):
        problems.append('the mount sits inside a function/arrow body, so the gate cannot prove it ever runs')
    if re.search(r'\b' + re.escape(element_var) + r'\s*=(?!=)', between):
        problems.append('%s is reassigned before the mount, so the guard no longer proves the element exists'
                        % element_var)
    for condition in re.findall(r'\bif\s*\(([^)]*)\)', between):
        if condition.strip() != element_var:
            problems.append('the mount is gated behind `if (%s)`, which the gate cannot prove is true'
                            % condition.strip())

    return problems


first_problems = None
for mount in mounts:
    problems = mount_problems(mount)
    if not problems:
        sys.exit(0)
    if first_problems is None:
        first_problems = problems

fail('main.jsx must render the ./App.jsx component on the element that index.html serves:\n  - %s'
     % '\n  - '.join(first_problems))
PY
then
  echo "the contract must hold on the surface that executes: index.html must load the live entry, and the" >&2
  echo "entry must render the ./App.jsx component on the element the served HTML provides." >&2
  echo "(importing the module is not the same claim as mounting it; a commented-out tag, import or JSX" >&2
  echo "element does not count as wiring)" >&2
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
