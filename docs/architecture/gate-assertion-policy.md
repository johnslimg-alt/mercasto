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

## The enforcing check

`scripts/gate-integrity-check.mjs` runs in `npm run check:gate-integrity`, in
`npm run gate:prod`, and as a step in `.github/workflows/recovery-guard.yml` (which also
runs its contract tests). It fails CI on three things:

| Check | Fails when |
| --- | --- |
| `dead-code-assertion` | A gate asserts a literal whose every occurrence lives in a controller method that no route, callable reference, container resolution or reachable same-class caller reaches. |
| `gate-not-triggered` | A file asserted by `check-recovery-guards.mjs` is covered by no workflow that **executes** it — i.e. the guard cannot observe a regression there. |
| `invalid-waiver` | A waiver omits `owner`, `reason`, `gate` or `target`, or names an unknown check. |

Precision matters in three places, and each is pinned by a negative control:

- **Reachability is transitive and receiver-scoped.** Seeds are routes, callable pairs
  (`C::class, 'm'`, `'C@m'`) and container resolutions (`app(C::class)->m(`). The only
  intra-class edges are `$this->m(`, `self::m(` and `static::m(` **inside a reachable
  method**. A helper called only from unreachable code stays unreachable, and
  `$query->index()` is not a call to the controller's own `index()`.
- **Route declarations expose only their actions.** `apiResource`/`resource` contribute
  their conventional action set (honouring `only`/`except`); `Route::controller(C::class)`
  contributes only the actions its group explicitly declares. Neither marks a whole class
  reachable, so an undeclared method cannot hide behind a resource route.
- **Production reachability ignores `backend/tests`.** A PHPUnit reference is not a
  production call site.

Trigger coverage is deliberately broader than dead-code detection: it considers **every
repository file the guard reads**, including root files (`index.html`) and workflow files
(`.github/workflows/emergency-*.yml`), because dropping their trigger entry would otherwise
go unnoticed. A workflow counts only if a `run:` command actually executes the guard —
a path listed under `paths:`, or a mention inside a shell comment, is not execution, and
`npm run` indirection is resolved through `package.json`. A workflow filtered only by
`paths-ignore` runs everywhere except the ignored patterns, so its deny list is honoured
rather than discarded.

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
| RC-3 misses **negative** shell guards. | `if grep -qF "literal" path; then fail; fi` is a claim about `path`, but only positive assertions are collected as asserted targets, so a target referenced solely by a negative guard is not reported as an orphan. Live instance found while retargeting the CSRF/session gate: `funnel-analytics-contract-gate.sh:58` asserts the dead `src/contexts/AuthContext.jsx`. |
| RC-3 audits `scripts/` only. | `tests/**/*.test.mjs` assert file contents too — `tests/funnel-analytics-contract.test.mjs:62` reads the dead `src/contexts/AuthContext.jsx`. Widening the audit to the test suite is a separate change, not a bigger regex. |
| A **missing** asserted file silently hollows an `if grep` guard. | `grep` exits 2 on a missing file and `if` treats non-zero as false, so the guard passes without evaluating anything. Verified by deleting the file in a scratch copy: `funnel-analytics-contract-gate.sh:58` reports no error and the gate continues. A `test -f` over the asserted targets is the cheap mitigation. |
| The entry-point **mount** is asserted structurally, so only the mount shapes it recognises are certified. | `csrf-session-contract-gate.sh` proves `./App.jsx` is **rendered**, not merely imported: it takes the component binding from the import clause and requires it to appear as a JSX element inside the argument of an active `createRoot(<#root element>).render(...)` call, with the mount element actively served by `index.html` and not gated behind a condition that cannot be true. A mount refactored into a helper function or a wrapper component fails closed rather than passing unproven. That is deliberate: a mount the analysis cannot follow is exactly the claim it must not certify, so the gate is updated when the entry-point shape changes. |
| A gate can assert **sign-in token storage** only as a presence check. | The token is stored in several distinct flows (email/password, phone, two-step, OAuth exchange, magic-link) with more than one call site each, so pinning a single one would be arbitrary and would leave the others unproven. Proving every flow stores the token needs a behavioural test that drives each flow. The **sign-out** half is scoped properly: `csrf-session-contract-gate.sh` brace-matches the body of `handleLogout` and requires the clear inside it, because `removeItem('auth_token')` also appears in `resetSessionAndReload()` and the 401 recovery path. |
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
4. Run `npm run check:gate-integrity` and `npm run check:scripts`.
5. State, in the PR, what would have to break for the new assertion to fail.
