# Gate assertion policy: assert behaviour, not prose

Status: active
Owner: engineering (gate maintenance)
Enforced by: `node scripts/gate-integrity-check.mjs` (`npm run check:gate-integrity`)

This repository enforces most of its safety invariants with gate scripts that read other
files and assert their **contents**. That technique is sometimes the right one and
sometimes actively harmful. This document defines which is which, and the check that
enforces the rule.

## Why this exists

Five incidents, three of which had a gate actively protecting the defect:

1. **Dead-code gate hid a P0.** `scripts/check-recovery-guards.mjs` required the literal
   `orderBy('ads.is_catalog_filler', 'asc')` inside
   `backend/app/Http/Controllers/Api/AdController.php`. That controller's `index()` method
   is not routed — `backend/routes/api.php` sends `GET /ads` to `AdIndexController@index`.
   The gate guarded unreachable code, so the real defect (all 5,677 "active" ads were
   catalog placeholders while genuine listings were archived and invisible) survived
   undetected. Compounding it, `recovery-guard.yml` did not list `backend/**` in its
   `paths:` filter, so the guard did not even run when that controller changed.
2. **The gate pinned the vulnerability.** A guard required
   `window.addEventListener('pointerdown', activateVendorAnalytics` — the exact
   capture-phase listener that started analytics/marketing vendors before the visitor
   answered the cookie banner. Fixing the P0 privacy breach required editing the gate.
3. **The gate codified the broken predicate.** `scripts/catalog-index-hygiene-gate.sh`
   froze the sitemap filter as `is_catalog_filler=false AND status='active' AND
   expires_at > now()`. That intersection is empty (fillers are stored with
   `expires_at = null`), so `sitemap-ads.xml` shipped zero URLs for months while CI stayed
   green.
4. **The gate broke on a legitimate refactor.** A guard asserted source text that an
   engineer correctly extracted into a new module. The refactor was right; the gate failed.
5. **The gate encoded a type bug.** `tests/ad-card-extraction-contract.test.mjs` pinned
   `Boolean(ad.is_catalog_filler)`, which treats the string `'false'` as truthy and
   mislabels a genuine ad as a placeholder.

The common thread: a source-text assertion tests **where a string is typed**, not **what
the system does**. It passes when the code is dead, when the code is the defect, and when
the code moved somewhere the string still exists but no longer runs.

## The rule

### Acceptable: text assertions for wiring and config presence

A source-text assertion is legitimate when the text **is** the deliverable — when its
presence or absence is the exact production fact you care about. Examples:

- A route is registered: `Route::get('/ads', [AdIndexController::class, 'index']);`
- A middleware is attached: `$middleware->appendToGroup('api', RejectUnsafeXmlUpload::class);`
- A command is scheduled in `routes/console.php`.
- A workflow trigger, a `paths:` entry, or a compose/env key exists.
- A file is executable, or parses (`bash -n`, `php -l`).
- A repository-wide **absence** invariant: no hardcoded secret, no `docker.sock`
  mount, no `llms.txt`. Absence scans are cheap, broad and genuinely behavioural.
- A cross-file contract whose exact string is load-bearing (e.g. an index name that
  `bootstrap/app.php` matches against a database error message).

### Not acceptable: text assertions for behaviour

If the invariant is about what happens at runtime, do **not** assert a literal. Assert
the behaviour:

- **Query semantics** — filtering, ordering, ranking, pagination. Write a feature test
  that calls the routed endpoint and checks the response.
- **Authorization / privacy** — who may read or write what. Call the route as the wrong
  actor and assert refusal.
- **Consent, tracking, payments, retention** — assert the observable effect (no vendor
  script loaded, no ledger row written), not the guard clause.
- **Anything that could be satisfied by dead code** — assert through the routed entry
  point.
- **Test coverage** — do not grep a test *method name*. Run the test. PHPUnit already
  runs in `backend-tests.yml`; `node --test tests/*.test.mjs` already runs in
  `frontend-quality.yml`. A gate may assert that a test file exists and is wired
  (wiring), but the assertion of behaviour belongs inside the test.

### Prefer structural assertions over prose when a gate must stay static

When a text assertion really is the only option, make it robust:

- Assert the **routed** file, and prefer the controller/method that production reaches.
- Assert the ordering rule applies to the **first** ordering key, not that some ordering
  call exists somewhere.
- Scope greps to a method body, not a whole 3,000-line file.
- Never assert line counts or exact occurrence counts that a legitimate addition breaks.
- Never pin a comment.

## Root causes covered (retrospective-2)

Retrospective 2 established that "a check that cannot see what it claims to protect"
is **four** root causes, not one. The checker now covers each as far as is mechanically
honest, and says where it cannot.

| RC | Class | Check | Gated? |
| --- | --- | --- | --- |
| RC-1 | No reachability check | `dead-code-assertion`, `gate-not-triggered` | yes |
| RC-3 | Wrong observation surface | `asserted-orphan` | yes |
| RC-4 | No proof the check can fail | `never-fails`, `no-negative-control` | yes |
| RC-2 | Invariant derived from current code, not intent | `code-derived-invariant` | **no — measured and reported only** |

### RC-3 — does the gate read the artifact that is actually delivered?

`asserted-orphan` fails when a gate asserts a `src/**` module that **no frontend entry
point can reach**. `index.html` loads `/src/main.jsx`; everything the SPA can execute is
reachable from there through static and dynamic imports. A module outside that set never
runs in the browser, so asserting its contents observes an intermediate artifact instead of
the delivered page. This is the recorded `/reembolsos/` defect: a gate asserted an orphaned
React screen while the shipped page was static HTML under `public/`.

Resolution is deliberately conservative — an unresolvable specifier is treated as external,
and if there is no entry point at all the analysis is **skipped with a note** rather than
guessing, because a false orphan accusation is worse than a missed one.

Where the question cannot be decided mechanically, the answer is a **declaration, not a
guess**: add a waiver with an `owner` and a `reason` stating why the target is still the
delivered artifact. A declaration that stops being needed goes stale and fails the check.

### RC-4 — can the check actually fail?

- `never-fails` catches a specific, proven-dead shape: `grep -q … | grep -q …`. `grep -q`
  writes nothing to stdout, so the right-hand side always reads an empty stream, the
  condition can never be true, and a guard written this way can never fire. Shell comments
  are stripped first, so a pattern that was fixed by commenting it out is not reported.
- `no-negative-control` reports a gate with no evidence that anything proves it can fail.
  Three proxies, in decreasing strength: a companion `scripts/<name>.test.*`, a
  `tests/**/*.test.mjs` naming the gate, or an in-gate assertion program
  (`node --test` or an inline `assert`/`sys.exit` program).

### RC-2 — measured, never gated, and why

"Is this invariant derived from intent, or from whatever the code happens to do today?" is
**not mechanically decidable**. The same literal is legitimate when the implementation
fragment *is* the contract (a route registration, a middleware attachment, a scheduled
command) and illegitimate when it merely records current behaviour — and no tool can tell
those apart from the text alone.

So the checker **detects the shape and reports the count** — assertions whose literal is a
code fragment (`->`, `::`, `=>`, `$this`, `where(`, …) against an implementation target
(`src/`, `backend/app/`, `backend/resources/`) — and does **not** gate it. Gating this proxy
would force hundreds of waivers encoding a judgement the tool cannot make, which is fake
precision, and a gate that is wrong often enough gets ignored.

**The control for RC-2 is the policy rule below, not a check.** Run
`node scripts/gate-integrity-check.mjs --audit` to see the current count.

> **Rule (RC-2):** an invariant must be derived from intent — from what the system must do —
> and never from what the implementation currently happens to say. Before asserting an
> implementation fragment, ask what observable behaviour would break if it changed. If the
> answer is "nothing", the assertion freezes a bug or an accident. The clearest recorded
> instances are a guard that *required* a consent bypass to exist and a gate that codified a
> broken sitemap predicate — both green *because* the defect was present.

### The grandfathered population

`no-negative-control` describes a whole class, and most gates in this repository have no
control. `scripts/gate-coverage-baseline.json` grandfathers that existing population with
**one owner, one reason and a recorded date** rather than 165 near-identical entries. It is
a ratchet, and both directions are enforced:

- a gate with no control that is **not** listed fails outright — the population may not grow;
- a listed gate that **gains** a control becomes `stale-baseline` and fails until its entry
  is deleted — so the number can only fall.

## The enforcing check

`scripts/gate-integrity-check.mjs` runs in `npm run check:gate-integrity`, in
`npm run gate:prod`, and as a step in `.github/workflows/recovery-guard.yml` (which also
runs its contract tests). Run it with `--audit` for a per-class count without gating, or
`--json` for machine-readable output.

| Check | Fails when |
| --- | --- |
| `dead-code-assertion` | A gate asserts a literal whose every occurrence lives in a controller method that no route, callable reference, container resolution or reachable same-class caller reaches. |
| `gate-not-triggered` | A file asserted by `check-recovery-guards.mjs` is covered by no workflow that **executes** it — i.e. the guard cannot observe a regression there. |
| `asserted-orphan` | A gate asserts a `src/**` module no frontend entry point can reach. |
| `never-fails` | A condition pipes `grep -q` into `grep -q`, so it can never be true. |
| `no-negative-control` | A gate has no control evidence and is not in the baseline. |
| `invalid-waiver` / `invalid-baseline` | A waiver or baseline entry omits `owner`, `reason`, `gate` (and `target` where the check needs one), or names an unknown check. |
| `stale-waiver` / `stale-baseline` | An entry no longer matches any finding and must be deleted. |

Precision matters in three places, and each is pinned by a negative control:

- **Reachability is transitive and receiver-scoped.** Seeds are routes, callable pairs
  (`C::class, 'm'`, `'C@m'`), container resolutions (`app(C::class)->m(`) and direct static
  dispatch (`C::m(`). The only intra-class edges are `$this->m(`, `self::m(` and
  `static::m(` **inside a reachable method**. A helper called only from unreachable code
  stays unreachable, and `$query->index()` is not a call to the controller's own `index()`.
- **Route declarations expose only their actions.** `apiResource`/`resource` contribute
  their conventional action set (honouring `only`/`except`); `Route::controller(C::class)`
  contributes only the actions its group explicitly declares. Neither marks a whole class
  reachable, so an undeclared method cannot hide behind a resource route.
- **Production reachability ignores `backend/tests`.** A PHPUnit reference is not a
  production call site.

Trigger coverage is deliberately broader than dead-code detection: it considers **every
repository file the guard reads or makes a claim about — positive or negative**, including
root files (`index.html`) and workflow files (`.github/workflows/emergency-*.yml`), because
dropping their trigger entry would otherwise go unnoticed. A workflow counts only if a
`run:` command actually **executes** the guard — a path listed under `paths:`, mentioned in
a shell comment, or merely passed to `test -f`/`echo` is not execution, and `npm run`
indirection is resolved through `package.json`. Inline flow-style `paths: [...]` and
`paths-ignore`-only filters are both honoured.

### Waivers

Known violations owned by another in-flight PR go in
`scripts/gate-integrity-waivers.json`. Every waiver **must** name an `owner`, a `reason`, a
`gate` and a `target` — enough to bind it to one concrete violation. A broad
`{"check": "..."}` entry is rejected as `invalid-waiver`, because it could suppress
whichever matching violation appeared first and stay non-stale as one violation replaced
another. Waivers are self-expiring: once the owning PR lands and the violation disappears,
the check reports `stale-waiver` and fails CI until the entry is deleted.

Do not add a waiver to make a real violation disappear. Fix the gate.

### Known limits — deliberately not closed

Documented rather than hidden. A green `check:gate-integrity` does **not** mean every gate
verifies behaviour.

| Limit | Why it is not closed |
| --- | --- |
| Only `assertContains`/`assertOrder` and `grep -q*F`-family lines are parsed. | A gate that builds assertions dynamically — `xargs grep`, `grep -f patterns`, string concatenation, a bespoke wrapper — is not audited. Closing this needs a real parser per language, not a bigger regex. |
| CHECK A reasons about **controllers only**. | A literal pinned to unreachable code in a service, job, command, model, or an orphaned component is not detected. This is a real case in this repository: `fixed-period-plan-copy-gate.sh` asserts the orphaned `ReembolsosScreen.jsx` while the shipped page violates the rule. Extending reachability to every class is a substantially larger model. |
| Assertion **literals** held in a variable resolve only for simple `const`/`VAR=` bindings. | Computed or concatenated literals are not resolved. |
| Glob targets (e.g. `backend/database/migrations/*payments*`) are skipped. | A glob has no single subject to reason about; deciding whether a gate over a glob is dead requires different logic. |
| Frontend reachability is not modelled. | An asserted `.jsx`/`.js` file that no entry point imports passes. |
| Custom assertion helpers are not parsed. | `assertFirstOrderingKey(...)`-style helpers in `check-recovery-guards.mjs` are outside the two recognised shapes. |

The **policy** above, not this checker, is the primary control. The checker is a backstop
for the incident-1 shape and the unrun-gate mechanism, and it reports what it can prove.

### Negative controls

`tests/gate-integrity-contract.test.mjs` proves the checker can fail: scratch fixtures
violate each invariant and the test asserts a non-zero exit. A checker that cannot fail is
worse than no checker, because it manufactures confidence.

## Adding a new gate

1. Decide whether the invariant is **wiring/config** or **behaviour**.
2. Behaviour: write the test first, run it, then have the gate assert the test file exists
   and names the invariant (or, better, just rely on the test running in CI).
3. Wiring: assert the literal, and make sure a workflow actually runs your gate when the
   asserted file changes.
4. **Write the control.** Every gate needs evidence it can fail: a companion
   `scripts/<name>.test.*`, a `tests/**/*.test.mjs` naming it, or an in-gate assertion
   program. A gate with none of those fails `no-negative-control` unless it is added to
   `scripts/gate-coverage-baseline.json` — and adding to that file is a decision with an
   owner attached, not a formality.
5. **Name the delivered artifact.** Assert the thing that ships. If you assert a `src/**`
   module, it must be reachable from a frontend entry point (`asserted-orphan`).
6. Run `npm run check:gate-integrity` and `npm run check:scripts`.
7. State, in the PR, what would have to break for the new assertion to fail.

## Limits accepted (what this checker still cannot see)

Recorded so a green run is not mistaken for complete coverage.

| Limit | Why it stands |
| --- | --- |
| RC-2 is **not gated**. | "Derived from intent" is not decidable; gating the shape proxy would encode a judgement the tool cannot make. The policy rule plus the `--audit` count is the control. |
| RC-3 covers the **frontend** import graph only. | Whether a `backend/app` class, a config key, or a `public/**` file reaches production is not decidable from the repository alone (routes, observers, containers, nginx). Those targets need a declaration, and the checker does not pretend otherwise. |
| RC-3 resolution is conservative. | A specifier that cannot be resolved (alias, package, computed path) is treated as external, and modules it would have reached are assumed reachable. False negatives, never false orphans. |
| `no-negative-control` uses **proxies**. | A gate may have a real control the three proxies cannot see (a control embedded in a shared harness, or a control in another repository). That is why the existing population is grandfathered rather than declared broken. |
| `never-fails` catches **one proven shape**. | Other unprovable checks exist (an `if` whose body does nothing, an assertion on a variable never set). Each needs its own proof before it can be reported honestly. |
| Reachability models **routes, callable pairs, container resolution, static dispatch and intra-class calls**. | A method reached only through a package registry, a dynamic `call_user_func`, a string-built class name, or a framework convention is not modelled. The model over-counts reachability deliberately; a checker that reports live code as dead is how working code gets deleted. |
| Only `assertContains`/`assertOrder`/`assertNotContains` and `grep -q*F`-family lines are parsed. | A gate that builds assertions dynamically (`xargs grep`, `grep -f patterns`, concatenation, a bespoke wrapper) is not audited. |
| A shell `grep` literal must be **quoted**. | `grep -qF lit path` (unquoted) is not parsed, so its target is not orphan-checked and its literal is not extracted. Real gates quote their literals; widening to unquoted forms risks reading shell syntax as a literal. |
| `never-fails` scans **shell gates only**. | A `.mjs` gate that shells out to a piped `grep` is not scanned. Applying shell parsing to JavaScript produced a false positive on this checker's own docstring the moment continuations were joined, so the scan is restricted to `.sh` rather than guessing. |
| Computed import specifiers mark their whole **prefix directory** reachable. | `import(\`./locales/${lang}.js\`)` makes every module under `src/locales/` reachable, which is conservative on purpose: it can over-count reachability (a false negative for `asserted-orphan`) but never invents an orphan. |
| Every `scripts/*.mjs` and `scripts/*.sh` is treated as a gate. | Some files there are TOOLS, not gates — `scripts/rasterize-og-default.mjs` rasterises an SVG and asserts nothing, so demanding a negative control of it is a category error. The check cannot tell a tool from a gate, so such files are listed in the baseline with a named reason rather than silently dropped; the honest fix is a marker or naming convention distinguishing them, which belongs to that file's owner. |
| Aliases are not resolved. | If a project alias is ever configured, orphan verdicts are skipped for the run with a note instead of resolved. An alias-resolved module and an orphan are indistinguishable without reading the alias config, and a false orphan accusation is worse than a missed one. |
| Assertion **literals** resolve only for simple `const`/`VAR=` bindings. | Computed or concatenated literals are not resolved. Globs are skipped: a glob has no single subject to reason about. |
| Dead code **outside controllers** is not reported. | Extending reachability to every PHP class is a much larger model; RC-3's orphan check covers the frontend half. |
