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
`npm run gate:prod`, and as a step in `.github/workflows/recovery-guard.yml`. It fails CI
on two things:

| Check | Fails when |
| --- | --- |
| `dead-code-assertion` | A gate asserts a literal whose every occurrence lives in a controller method that no route, callable reference, container resolution or in-class caller reaches. |
| `gate-not-triggered` | A file asserted by `check-recovery-guards.mjs` is covered by no workflow that runs it — i.e. the guard cannot observe a regression there. |

A method counts as reachable if a route reaches it (including `apiResource` /
`Route::controller`), or it appears as `C::class, 'm'` / `'C@m'`, or it is called from
inside its own class (`$this->m(`), or it is resolved via `app(C::class)->m(`. Only when
none of those hold is an assertion guarding code that cannot run.

### Waivers

Known violations owned by another in-flight PR go in
`scripts/gate-integrity-waivers.json`. Every waiver **must** name an owner and a reason.
Waivers are self-expiring: once the owning PR lands and the violation disappears, the
check reports `stale-waiver` and fails CI until the entry is deleted. A waiver can
therefore never rot into a permanent silent suppression.

Do not add a waiver to make a real violation disappear. Fix the gate.

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
