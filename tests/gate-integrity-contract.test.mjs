import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Contract tests for scripts/gate-integrity-check.mjs.
 *
 * The checker exists because the repository's safety gates repeatedly asserted
 * source text in code that could never run (incident 1: a guard pinned a ranking
 * clause inside the unrouted AdController::index), and because the guards' own CI
 * triggers did not fire for the files they asserted on.
 *
 * A checker that cannot fail is worthless, so every check here has a negative
 * control: the scratch repository is built to VIOLATE the invariant and the test
 * asserts that the checker exits non-zero and names the violation. The positive
 * control asserts the same tree passes once the violation is removed.
 */

const CHECKER = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'gate-integrity-check.mjs');

/** Builds a throwaway repo containing only what the checker inspects. */
function scratchRepo({ routedMethods = ['show'], workflowPaths = null, waivers = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'gate-integrity-'));

  const controller = 'backend/app/Http/Controllers/Api/FooController.php';
  mkdirSync(join(root, 'backend/app/Http/Controllers/Api'), { recursive: true });
  mkdirSync(join(root, 'backend/routes'), { recursive: true });
  mkdirSync(join(root, 'scripts'), { recursive: true });

  // Two methods with DISTINCT literals, mirroring AdController's live/dead split.
  // `index()` is unrouted by default; `show()` is routed.
  writeFileSync(join(root, controller), [
    '<?php',
    'class FooController',
    '{',
    '    public function index()',
    '    {',
    "        $query->orderBy('foo.dead', 'asc');",
    '    }',
    '',
    '    public function show()',
    '    {',
    "        $query->orderBy('foo.live', 'asc');",
    '    }',
    '}',
    '',
  ].join('\n'));

  // A gate that pins both literals, using the same assertContains shape as the
  // repository's real guards. The `foo.dead` assertion is satisfied only by
  // unrouted index() unless the routing below changes.
  writeFileSync(join(root, 'scripts', 'sample-gate.mjs'), [
    "import { readFileSync } from 'node:fs';",
    'function assertContains(path, needle) {',
    "  if (!readFileSync(path, 'utf8').includes(needle)) throw new Error(`missing ${needle}`);",
    '}',
    `assertContains('${controller}', "orderBy('foo.dead', 'asc')", 'dead-method ranking');`,
    `assertContains('${controller}', "orderBy('foo.live', 'asc')", 'live-method ranking');`,
    '',
  ].join('\n'));

  const routes = routedMethods
    .map((method, i) => `Route::get('/foo${i ? '/{id}' : ''}', [FooController::class, '${method}']);`)
    .join('\n');
  writeFileSync(join(root, 'backend/routes/api.php'), `<?php\n${routes}\n`);

  if (workflowPaths) {
    mkdirSync(join(root, '.github/workflows'), { recursive: true });
    writeFileSync(join(root, '.github/workflows/guard.yml'), [
      'name: Guard',
      'on:',
      '  pull_request:',
      '    paths:',
      ...workflowPaths.map((p) => `      - '${p}'`),
      'jobs:',
      '  check:',
      '    steps:',
      '      - run: node scripts/check-recovery-guards.mjs',
      '',
    ].join('\n'));
  }

  if (waivers) {
    writeFileSync(join(root, 'scripts/gate-integrity-waivers.json'), JSON.stringify({ waivers }, null, 2));
  }

  // RC-4: baseline the fixture's own gate, which deliberately carries no control.
  writeFileSync(join(root, 'scripts/gate-coverage-baseline.json'), JSON.stringify({
    owner: 'fixture',
    recordedAt: '2026-01-01',
    reason: 'fixture gate probes other checks and deliberately carries no control',
    entries: [{ check: 'no-negative-control', gate: 'scripts/sample-gate.mjs' }],
  }, null, 2));

  return root;
}

/** Runs the checker with extra CLI flags (e.g. --audit). */
function runCheckerWithArgs(root, args) {
  try {
    const stdout = execFileSync(process.execPath, [CHECKER, ...args], {
      env: { ...process.env, GATE_INTEGRITY_ROOT: root },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, output: stdout };
  } catch (error) {
    return { status: error.status, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

function runChecker(root) {
  try {
    const stdout = execFileSync(process.execPath, [CHECKER], {
      env: { ...process.env, GATE_INTEGRITY_ROOT: root },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, output: stdout };
  } catch (error) {
    return { status: error.status, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

test('negative control: a gate that pins unreachable controller code fails the check', () => {
  const root = scratchRepo({ routedMethods: ['show'] });
  try {
    const { status, output } = runChecker(root);
    assert.notEqual(status, 0, 'the checker must fail when a gate asserts dead code');
    assert.match(output, /dead-code-assertion/);
    assert.match(output, /FooController@index\(\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('positive control: the same gate passes once the asserted code is reachable', () => {
  // Route BOTH methods, so every asserted literal lives in reachable code.
  const root = scratchRepo({ routedMethods: ['index', 'show'] });
  try {
    const { status, output } = runChecker(root);
    assert.equal(status, 0, `expected the checker to pass, got:\n${output}`);
    assert.match(output, /Gate integrity check OK/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('negative control: a gate whose CI trigger misses an asserted file fails the check', () => {
  // The recovery guard asserts backend/routes/api.php but the workflow that runs
  // it only fires for scripts/**, so a change to that route file is unobserved.
  const root = scratchRepo({ workflowPaths: ['scripts/**'] });
  try {
    writeFileSync(
      join(root, 'scripts', 'check-recovery-guards.mjs'),
      [
        "import { readFileSync } from 'node:fs';",
        'function assertContains(path, needle) {',
        "  if (!readFileSync(path, 'utf8').includes(needle)) throw new Error(`missing ${needle}`);",
        '}',
        "assertContains('backend/routes/api.php', 'Route::get', 'foo route stays registered');",
        '',
      ].join('\n')
    );

    const { status, output } = runChecker(root);
    assert.notEqual(status, 0, 'the checker must fail when a workflow cannot observe an asserted file');
    assert.match(output, /gate-not-triggered/);
    assert.match(output, /backend\/routes\/api\.php/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('negative control: a comment inside paths: must not disable trigger coverage', () => {
  // Regression guard for the parser bug where an indented `#` comment ended the
  // paths list, silently turning every trigger check into a pass.
  const root = scratchRepo({ workflowPaths: [] });
  try {
    writeFileSync(
      join(root, '.github/workflows/guard.yml'),
      [
        'name: Guard',
        'on:',
        '  pull_request:',
        '    paths:',
        '      # a comment that must not terminate the list',
        "      - 'scripts/**'",
        'jobs:',
        '  check:',
        '    steps:',
        '      - run: node scripts/check-recovery-guards.mjs',
        '',
      ].join('\n')
    );
    writeFileSync(
      join(root, 'scripts', 'check-recovery-guards.mjs'),
      [
        "import { readFileSync } from 'node:fs';",
        'function assertContains(path, needle) {',
        "  if (!readFileSync(path, 'utf8').includes(needle)) throw new Error(`missing ${needle}`);",
        '}',
        "assertContains('backend/routes/api.php', 'Route::get', 'foo route stays registered');",
        '',
      ].join('\n')
    );

    const { status, output } = runChecker(root);
    assert.notEqual(status, 0, 'the comment must not hide the uncovered asserted file');
    assert.match(output, /gate-not-triggered/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('negative control: a waiver that no longer matches a violation fails the check', () => {
  // Route both methods so no dead-code violation exists, leaving the waiver stale.
  const root = scratchRepo({
    routedMethods: ['index', 'show'],
    waivers: [{
      check: 'dead-code-assertion',
      gate: 'scripts/sample-gate.mjs',
      target: 'backend/app/Http/Controllers/Api/FooController.php',
      // Fully specified, so it is a VALID waiver that matches nothing -- which is
      // what "stale" means. An under-specified waiver is rejected as
      // invalid-waiver instead, and that case is covered separately.
      literalContains: "orderBy('foo.dead'",
      owner: 'nobody',
      reason: 'stale by construction',
    }],
  });
  try {
    const { status, output } = runChecker(root);
    assert.notEqual(status, 0, 'a stale waiver must fail so it cannot suppress silently forever');
    assert.match(output, /stale-waiver/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the real repository passes the gate integrity check', () => {
  const { status, output } = runChecker(join(dirname(fileURLToPath(import.meta.url)), '..'));
  assert.equal(status, 0, `the repository must satisfy its own gate integrity check:\n${output}`);
});

/* ------------------------------------------------------------------ *
 * Negative controls for the review-driven hardening.
 *
 * Each of these pins a check that a review found could pass while the
 * condition it claims to detect was true. They are regression guards: if the
 * hardening is reverted, the corresponding test fails.
 * ------------------------------------------------------------------ */

const CONTROLLER_PATH = 'backend/app/Http/Controllers/Api/FooController.php';
const ROUTES_PATH = 'backend/routes/api.php';
const GUARD_PATH = 'scripts/check-recovery-guards.mjs';

/** Declarative fixture: a map of repo-relative path -> file contents. */
function fixtureRepo(files) {
  const root = mkdtempSync(join(tmpdir(), 'gate-integrity-fx-'));
  const all = {
    'package.json': JSON.stringify({ name: 'fixture', version: '1.0.0', scripts: {} }),
    ...files,
  };
  // RC-4 now asks every gate to prove it can fail. Fixtures probe a different
  // check each time and their gates deliberately carry no controls, so give the
  // fixture a baseline covering its OWN gates. Tests that exercise the control
  // check itself supply their own baseline instead.
  if (!all['scripts/gate-coverage-baseline.json']) {
    const entries = Object.keys(all)
      .filter((p) => /^scripts\/[^/]+\.(sh|mjs|cjs)$/.test(p) && !/\.test\./.test(p))
      .map((gate) => ({ check: 'no-negative-control', gate }));
    if (entries.length > 0) {
      all['scripts/gate-coverage-baseline.json'] = JSON.stringify({
        owner: 'fixture',
        recordedAt: '2026-01-01',
        reason: 'fixture gates probe other checks and deliberately carry no control',
        entries,
      }, null, 2);
    }
  }
  for (const [path, content] of Object.entries(all)) {
    mkdirSync(join(root, dirname(path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

function withRepo(files, assertion) {
  const root = fixtureRepo(files);
  try {
    return assertion(runChecker(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** A guard that asserts one literal in the shared fixture controller. */
function guardAsserting(literal, target = CONTROLLER_PATH) {
  return [
    "import { readFileSync } from 'node:fs';",
    'function assertContains(path, needle) {',
    "  if (!readFileSync(path, 'utf8').includes(needle)) throw new Error(`missing ${needle}`);",
    '}',
    `assertContains('${target}', ${JSON.stringify(literal)}, 'fixture invariant');`,
    '',
  ].join('\n');
}

function controllerWith(bodies) {
  return ['<?php', 'class FooController', '{', ...bodies, '}', ''].join('\n');
}

function workflowYaml({ paths = null, pathsIgnore = null, run = `node ${GUARD_PATH}` }) {
  const lines = ['name: Fixture', 'on:', '  pull_request:', '    paths:'];
  if (pathsIgnore) {
    lines.length = 4;
    lines.push('    paths-ignore:');
    for (const p of pathsIgnore) lines.push(`      - '${p}'`);
  } else {
    for (const p of paths ?? ['**']) lines.push(`      - '${p}'`);
  }
  lines.push('jobs:', '  check:', '    steps:', `      - run: ${run}`, '');
  return lines.join('\n');
}

// --- Finding: constant targets in JavaScript assertions (P1) ---------------

test('negative control: a constant JS target is resolved and audited', () => {
  const files = {
    [CONTROLLER_PATH]: controllerWith([
      '    public function index()',
      '    {',
      "        $query->orderBy('foo.dead', 'asc');",
      '    }',
      '',
      '    public function show()',
      '    {',
      "        $query->where('foo.live', 1);",
      '    }',
    ]),
    [ROUTES_PATH]: "<?php\nRoute::get('/foo/{id}', [FooController::class, 'show']);\n",
    'scripts/const-gate.mjs': [
      "import { readFileSync } from 'node:fs';",
      `const CONTROLLER = '${CONTROLLER_PATH}';`,
      'function assertContains(path, needle) {',
      "  if (!readFileSync(path, 'utf8').includes(needle)) throw new Error('missing');",
      '}',
      "assertContains(CONTROLLER, \"orderBy('foo.dead', 'asc')\", 'constant target');",
      '',
    ].join('\n'),
  };
  withRepo(files, ({ status, output }) => {
    assert.notEqual(status, 0, 'a constant-held target must still be audited');
    assert.match(output, /dead-code-assertion/);
    assert.match(output, /FooController@index\(\)/);
  });
});

// --- Finding: single-quoted and rooted shell paths (P2) --------------------

test('negative control: single-quoted and rooted shell targets are resolved', () => {
  const files = {
    [CONTROLLER_PATH]: controllerWith([
      '    public function index()',
      '    {',
      "        $query->orderBy('foo.dead', 'asc');",
      '    }',
    ]),
    [ROUTES_PATH]: "<?php\n",
    'scripts/quoted-gate.sh': [
      '#!/usr/bin/env bash',
      "ROOT_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")/..\" && pwd)\"",
      `CONTROLLER='${CONTROLLER_PATH}'`,
      `ROOTED="$ROOT_DIR/${CONTROLLER_PATH}"`,
      "grep -qF \"orderBy('foo.dead', 'asc')\" \"$CONTROLLER\"",
      "grep -qF \"orderBy('foo.dead', 'asc')\" \"$ROOTED\"",
      '',
    ].join('\n'),
  };
  withRepo(files, ({ status, output }) => {
    assert.notEqual(status, 0, 'single-quoted and rooted targets must both be audited');
    assert.match(output, /dead-code-assertion/);
  });
});

// --- Finding: a mention is not an execution (P1) --------------------------

test('negative control: merely MENTIONING the guard does not count as running it', () => {
  const base = {
    [CONTROLLER_PATH]: controllerWith([
      '    public function index()',
      '    {',
      "        $query->orderBy('foo.rank', 'asc');",
      '    }',
      '    public function show()',
      '    {',
      "        $query->where('foo.live', 1);",
      '    }',
    ]),
    [ROUTES_PATH]: "<?php\nRoute::get('/foo/{id}', [FooController::class, 'show']);\n",
    [GUARD_PATH]: guardAsserting("where('foo.live', 1)"),
  };

  // Control: the workflow genuinely executes the guard -> coverage holds.
  withRepo(
    { ...base, '.github/workflows/guard.yml': workflowYaml({ paths: ['backend/**', 'scripts/**'] }) },
    ({ status, output }) => {
      assert.equal(status, 0, `a workflow that runs the guard must give coverage:\n${output}`);
    }
  );

  // The workflow still lists the guard in an unrelated run step and a comment,
  // but no longer executes it. Mention must not satisfy coverage.
  withRepo(
    {
      ...base,
      '.github/workflows/guard.yml': workflowYaml({
        paths: ['backend/**', 'scripts/**'],
        run: 'node scripts/some-other-gate.mjs  # see scripts/check-recovery-guards.mjs',
      }),
      'scripts/some-other-gate.mjs': '// unrelated\n',
    },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'a mere mention of the guard must not count as executing it');
      assert.match(output, /gate-not-triggered/);
    }
  );
});

// --- Finding: non-source targets in trigger coverage (P1) -----------------

test('negative control: non-source guard targets are covered too', () => {
  const files = {
    [ROUTES_PATH]: "<?php\n",
    [GUARD_PATH]: guardAsserting('workflow_dispatch', '.github/workflows/emergency-ssh-frontend-deploy.yml'),
    '.github/workflows/emergency-ssh-frontend-deploy.yml': 'name: Emergency\non:\n  workflow_dispatch:\n',
    // Triggers cover scripts but NOT the workflow file the guard asserts.
    '.github/workflows/guard.yml': workflowYaml({ paths: ['scripts/**'] }),
  };
  withRepo(files, ({ status, output }) => {
    assert.notEqual(status, 0, 'a non-source asserted file left uncovered must fail');
    assert.match(output, /gate-not-triggered/);
    assert.match(output, /emergency-ssh-frontend-deploy\.yml/);
  });
});

// --- Finding: paths-ignore-only workflows (P2) ----------------------------

test('negative control: paths-ignore-only filters are honoured', () => {
  const base = {
    [CONTROLLER_PATH]: controllerWith([
      '    public function show()',
      '    {',
      "        $query->where('foo.live', 1);",
      '    }',
    ]),
    [ROUTES_PATH]: "<?php\nRoute::get('/foo/{id}', [FooController::class, 'show']);\n",
    [GUARD_PATH]: guardAsserting("where('foo.live', 1)"),
  };

  // Runs everywhere except docs -> the asserted file is covered.
  withRepo(
    { ...base, '.github/workflows/guard.yml': workflowYaml({ pathsIgnore: ['docs/**'] }) },
    ({ status, output }) => {
      assert.equal(status, 0, `paths-ignore on docs must not deny coverage:\n${output}`);
    }
  );

  // The asserted file is on the deny list -> the guard cannot observe it.
  withRepo(
    { ...base, '.github/workflows/guard.yml': workflowYaml({ pathsIgnore: ['backend/**'] }) },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'a file on paths-ignore must count as uncovered');
      assert.match(output, /gate-not-triggered/);
      assert.match(output, /FooController\.php/);
    }
  );
});

// --- Finding: PHPUnit references are not production reachability (P2) -----

test('negative control: a PHPUnit-only reference does not make a method reachable', () => {
  const files = {
    [CONTROLLER_PATH]: controllerWith([
      '    public function legacy()',
      '    {',
      "        $query->orderBy('foo.dead', 'asc');",
      '    }',
    ]),
    [ROUTES_PATH]: "<?php\n",
    'backend/tests/Feature/FooControllerTest.php': [
      '<?php',
      'class FooControllerTest',
      '{',
      '    public function test_legacy()',
      '    {',
      "        app(FooController::class)->legacy();",
      "        $pair = [FooController::class, 'legacy'];",
      '    }',
      '}',
      '',
    ].join('\n'),
    'scripts/legacy-gate.mjs': guardAsserting("orderBy('foo.dead', 'asc')"),
  };
  withRepo(files, ({ status, output }) => {
    assert.notEqual(status, 0, 'a test-only call site must not count as production reachability');
    assert.match(output, /dead-code-assertion/);
    assert.match(output, /FooController@legacy\(\)/);
  });
});

// --- Finding: route declarations expose only their actions (P2) ----------

test('negative control: a resource route exposes only its conventional actions', () => {
  const controller = controllerWith([
    '    public function index()',
    '    {',
    "        $query->where('foo.index', 1);",
    '    }',
    '    public function legacy()',
    '    {',
    "        $query->orderBy('foo.dead', 'asc');",
    '    }',
  ]);

  // `index` is a conventional apiResource action -> reachable.
  withRepo(
    {
      [CONTROLLER_PATH]: controller,
      [ROUTES_PATH]: "<?php\nRoute::apiResource('foo', FooController::class);\n",
      'scripts/index-gate.mjs': guardAsserting("where('foo.index', 1)"),
    },
    ({ status, output }) => {
      assert.equal(status, 0, `apiResource must expose index:\n${output}`);
    }
  );

  // `legacy` is NOT exposed by apiResource -> still dead.
  withRepo(
    {
      [CONTROLLER_PATH]: controller,
      [ROUTES_PATH]: "<?php\nRoute::apiResource('foo', FooController::class);\n",
      'scripts/legacy-rg-gate.mjs': guardAsserting("orderBy('foo.dead', 'asc')"),
    },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'apiResource must not make every method reachable');
      assert.match(output, /dead-code-assertion/);
      assert.match(output, /FooController@legacy\(\)/);
    }
  );
});

test('negative control: Route::controller exposes only declared actions', () => {
  const controller = controllerWith([
    '    public function declared()',
    '    {',
    "        $query->where('foo.declared', 1);",
    '    }',
    '    public function legacy()',
    '    {',
      "        $query->orderBy('foo.dead', 'asc');",
    '    }',
  ]);

  withRepo(
    {
      [CONTROLLER_PATH]: controller,
      [ROUTES_PATH]: [
        '<?php',
        'Route::controller(FooController::class)->group(function () {',
        "    Route::get('/foo', 'declared');",
        '});',
        '',
      ].join('\n'),
      'scripts/declared-gate.mjs': guardAsserting("where('foo.declared', 1)"),
      'scripts/legacy-rc-gate.mjs': guardAsserting("orderBy('foo.dead', 'asc')"),
    },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'an undeclared method must stay dead under Route::controller');
      assert.match(output, /dead-code-assertion/);
      assert.match(output, /FooController@legacy\(\)/);
      assert.doesNotMatch(output, /FooController@declared\(\)/);
    }
  );
});

// --- Finding: self-calls only from reachable methods, only $this/self -----

test('negative control: a helper reachable only from dead code stays dead', () => {
  const files = {
    [CONTROLLER_PATH]: controllerWith([
      '    public function index()',
      '    {',
      '        $this->helper();',
      '    }',
      '    public function helper()',
      '    {',
      "        $query->orderBy('foo.dead', 'asc');",
      '    }',
      '    public function show()',
      '    {',
      "        $query->where('foo.live', 1);",
      '    }',
    ]),
    [ROUTES_PATH]: "<?php\nRoute::get('/foo/{id}', [FooController::class, 'show']);\n",
    'scripts/helper-gate.mjs': guardAsserting("orderBy('foo.dead', 'asc')"),
  };
  withRepo(files, ({ status, output }) => {
    assert.notEqual(status, 0, 'a helper called only from unreachable code is unreachable');
    assert.match(output, /dead-code-assertion/);
    assert.match(output, /FooController@helper\(\)/);
  });
});

test('a helper called from a reachable method is reachable', () => {
  const files = {
    [CONTROLLER_PATH]: controllerWith([
      '    public function index()',
      '    {',
      "        $query->orderBy('foo.dead', 'asc');",
      '    }',
      '    public function show()',
      '    {',
      '        $this->helper();',
      '    }',
      '    public function helper()',
      '    {',
      "        $query->where('foo.helper', 1);",
      '    }',
    ]),
    [ROUTES_PATH]: "<?php\nRoute::get('/foo/{id}', [FooController::class, 'show']);\n",
    'scripts/helper-live-gate.mjs': guardAsserting("where('foo.helper', 1)"),
  };
  withRepo(files, ({ status, output }) => {
    assert.equal(status, 0, `a helper of a routed method must be reachable:\n${output}`);
  });
});

test('negative control: an unrelated receiver does not mark a method reachable', () => {
  const files = {
    [CONTROLLER_PATH]: controllerWith([
      '    public function index()',
      '    {',
      "        $query->orderBy('foo.dead', 'asc');",
      '    }',
      '    public function show()',
      '    {',
      '        $query->index();',
      "        $query->where('foo.live', 1);",
      '    }',
    ]),
    [ROUTES_PATH]: "<?php\nRoute::get('/foo/{id}', [FooController::class, 'show']);\n",
    'scripts/receiver-gate.mjs': guardAsserting("orderBy('foo.dead', 'asc')"),
  };
  withRepo(files, ({ status, output }) => {
    assert.notEqual(status, 0, '$query->index() is not a call to the controller index()');
    assert.match(output, /dead-code-assertion/);
    assert.match(output, /FooController@index\(\)/);
  });
});

// --- Finding: waiver schema validation (P2) ------------------------------

test('negative control: an underspecified waiver is rejected', () => {
  const files = {
    [CONTROLLER_PATH]: controllerWith([
      '    public function index()',
      '    {',
      "        $query->orderBy('foo.dead', 'asc');",
      '    }',
    ]),
    [ROUTES_PATH]: "<?php\n",
    'scripts/waived-gate.mjs': guardAsserting("orderBy('foo.dead', 'asc')"),
    // Broad, ownerless: could suppress whichever violation appeared first.
    'scripts/gate-integrity-waivers.json': JSON.stringify({ waivers: [{ check: 'dead-code-assertion' }] }, null, 2),
  };
  withRepo(files, ({ status, output }) => {
    assert.notEqual(status, 0, 'a waiver without owner/reason/gate/target must be rejected');
    assert.match(output, /invalid-waiver/);
  });
});

test('a fully specified waiver binds to its violation and is accepted', () => {
  const files = {
    [CONTROLLER_PATH]: controllerWith([
      '    public function index()',
      '    {',
      "        $query->orderBy('foo.dead', 'asc');",
      '    }',
    ]),
    [ROUTES_PATH]: "<?php\n",
    'scripts/waived-ok-gate.mjs': guardAsserting("orderBy('foo.dead', 'asc')"),
    'scripts/gate-integrity-waivers.json': JSON.stringify({
      waivers: [{
        check: 'dead-code-assertion',
        gate: 'scripts/waived-ok-gate.mjs',
        target: CONTROLLER_PATH,
        literalContains: "orderBy('foo.dead'",
        owner: 'owner',
        reason: 'bound to one concrete violation',
      }],
    }, null, 2),
  };
  withRepo(files, ({ status, output }) => {
    assert.equal(status, 0, `a fully specified waiver must be honoured:\n${output}`);
    assert.match(output, /Waived \(owned and bound to one violation\)/);
  });
});

// --- Finding: negative-assertion targets in trigger coverage (P2) ---------

test('negative control: a negative-only asserted target must still be covered by a trigger', () => {
  const base = {
    'public/subject.js': "console.log('subject');\n",
    [GUARD_PATH]: [
      "import { readFileSync } from 'node:fs';",
      'function assertNotContains(path, needle) {',
      "  if (readFileSync(path, 'utf8').includes(needle)) throw new Error('unexpected');",
      '}',
      "assertNotContains('public/subject.js', 'bad-marker');",
      '',
    ].join('\n'),
  };

  // Control: the workflow fires for public/** -> the target is observable.
  withRepo(
    { ...base, '.github/workflows/guard.yml': workflowYaml({ paths: ['scripts/**', 'public/**'] }) },
    ({ status, output }) => {
      assert.equal(status, 0, `a covered negative target must pass:\n${output}`);
    }
  );

  // Negative-only targets used to be dropped, so this went unnoticed.
  withRepo(
    { ...base, '.github/workflows/guard.yml': workflowYaml({ paths: ['scripts/**'] }) },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'an uncovered negative-only target must fail');
      assert.match(output, /gate-not-triggered/);
      assert.match(output, /public\/subject\.js/);
    }
  );
});

// --- Finding: PHP comments must not seed reachability (P2) ---------------

test('negative control: a docblock callable pair does not make a method reachable', () => {
  const controllerBody = [
    '    /**',
    "     * Example: [FooController::class, 'legacy']",
    '     */',
    '    public function legacy()',
    '    {',
    "        $query->orderBy('foo.dead', 'asc');",
    '    }',
  ];

  // The only reference is inside a comment -> legacy() is still unreachable.
  withRepo(
    {
      [CONTROLLER_PATH]: controllerWith(controllerBody),
      [ROUTES_PATH]: "<?php\n",
      'scripts/comment-gate.mjs': guardAsserting("orderBy('foo.dead', 'asc')"),
    },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'a comment must not make a method reachable');
      assert.match(output, /dead-code-assertion/);
      assert.match(output, /FooController@legacy\(\)/);
    }
  );

  // Control: the same pair in real code (not a comment) does make it reachable.
  withRepo(
    {
      [CONTROLLER_PATH]: controllerWith([
        '    public function legacy()',
        '    {',
        "        $query->orderBy('foo.dead', 'asc');",
        '    }',
        '    public function dispatch()',
        '    {',
        "        $pair = [FooController::class, 'legacy'];",
        '    }',
      ]),
      [ROUTES_PATH]: "<?php\nRoute::get('/foo/{id}', [FooController::class, 'dispatch']);\n",
      'scripts/comment-ok-gate.mjs': guardAsserting("orderBy('foo.dead', 'asc')"),
    },
    ({ status, output }) => {
      assert.equal(status, 0, `a real callable pair must keep legacy reachable:\n${output}`);
    }
  );
});

test('negative control: a dead-code waiver without a binding literal is rejected', () => {
  // Two dead assertions live in the same controller, so gate+target alone cannot
  // identify one of them. Without literalContains the waiver would silently
  // transfer to whichever assertion becomes dead next and outlive its owner's
  // sign-off.
  const files = {
    [CONTROLLER_PATH]: controllerWith([
      '    public function index()',
      '    {',
      "        $query->orderBy('foo.first', 'asc');",
      '    }',
      '    public function legacy()',
      '    {',
      "        $query->orderBy('foo.second', 'asc');",
      '    }',
    ]),
    [ROUTES_PATH]: "<?php\n",
    'scripts/ambiguous-gate.mjs': [
      "import { readFileSync } from 'node:fs';",
      'function assertContains(path, needle) {',
      "  if (!readFileSync(path, 'utf8').includes(needle)) throw new Error('missing');",
      '}',
      `assertContains('${CONTROLLER_PATH}', "orderBy('foo.first', 'asc')", 'first');`,
      `assertContains('${CONTROLLER_PATH}', "orderBy('foo.second', 'asc')", 'second');`,
      '',
    ].join('\n'),
    'scripts/gate-integrity-waivers.json': JSON.stringify({
      waivers: [{
        check: 'dead-code-assertion',
        gate: 'scripts/ambiguous-gate.mjs',
        target: CONTROLLER_PATH,
        owner: 'owner',
        reason: 'no binding literal',
      }],
    }, null, 2),
  };
  withRepo(files, ({ status, output }) => {
    assert.notEqual(status, 0, 'an unbound dead-code waiver must be rejected');
    assert.match(output, /invalid-waiver/);
    assert.match(output, /literalContains is required/);
  });
});

// --- Finding: a command must INVOKE the guard, not merely name it (P2) ----

test('negative control: naming the guard without running it does not count', () => {
  const base = {
    [ROUTES_PATH]: "<?php\n",
    [GUARD_PATH]: guardAsserting('workflow_dispatch', '.github/workflows/emergency-ssh-frontend-deploy.yml'),
    '.github/workflows/emergency-ssh-frontend-deploy.yml': 'name: Emergency\non:\n  workflow_dispatch:\n',
  };
  const yaml = (run) => [
    'name: Fixture',
    'on:',
    '  pull_request:',
    '    paths:',
    "      - 'scripts/**'",
    "      - '.github/workflows/**'",
    'jobs:',
    '  check:',
    '    steps:',
    `      - run: ${run}`,
    '',
  ].join('\n');

  // Control: a real invocation -> the guard runs, coverage holds.
  withRepo(
    { ...base, '.github/workflows/guard.yml': yaml(`node ${GUARD_PATH}`) },
    ({ status, output }) => {
      assert.equal(status, 0, `a genuine invocation must count:\n${output}`);
    }
  );

  // Naming the path is not executing it: `test -f` and `echo` contain the path.
  for (const run of [`test -f ${GUARD_PATH}`, `echo ${GUARD_PATH}`]) {
    withRepo(
      { ...base, '.github/workflows/guard.yml': yaml(run) },
      ({ status, output }) => {
        assert.notEqual(status, 0, `"${run}" must NOT count as running the guard`);
        assert.match(output, /gate-not-triggered/);
      }
    );
  }
});

// --- Finding: inline (flow-style) workflow path filters (P2) -------------

test('negative control: inline paths flow sequences are parsed', () => {
  const base = {
    [ROUTES_PATH]: "<?php\n",
    [GUARD_PATH]: guardAsserting('workflow_dispatch', '.github/workflows/emergency-ssh-frontend-deploy.yml'),
    '.github/workflows/emergency-ssh-frontend-deploy.yml': 'name: Emergency\non:\n  workflow_dispatch:\n',
  };
  const yaml = (paths) => [
    'name: Fixture',
    'on:',
    '  pull_request:',
    `    paths: [${paths}]`,
    'jobs:',
    '  check:',
    '    steps:',
    `      - run: node ${GUARD_PATH}`,
    '',
  ].join('\n');

  // Control: the asserted workflow file is listed -> covered.
  withRepo(
    { ...base, '.github/workflows/guard.yml': yaml("'scripts/**', '.github/workflows/**'") },
    ({ status, output }) => {
      assert.equal(status, 0, `an inline list that covers the target must pass:\n${output}`);
    }
  );

  // The inline list omits the asserted workflow file. Treating the filter as
  // absent made the workflow look unfiltered and cover everything.
  withRepo(
    { ...base, '.github/workflows/guard.yml': yaml("'scripts/**'") },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'an inline list that omits the target must be honoured');
      assert.match(output, /gate-not-triggered/);
      assert.match(output, /emergency-ssh-frontend-deploy\.yml/);
    }
  );
});

// --- Finding: direct static controller calls are production reachability --

test('negative control: a direct static controller call keeps the method reachable', () => {
  const controller = controllerWith([
    '    public static function notifyAdChange($ad)',
    '    {',
    "        $query->orderBy('foo.dead', 'asc');",
    '    }',
  ]);

  // Without a static call site the method is unreachable.
  withRepo(
    {
      [CONTROLLER_PATH]: controller,
      [ROUTES_PATH]: "<?php\n",
      'scripts/static-gate.mjs': guardAsserting("orderBy('foo.dead', 'asc')"),
    },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'an uncalled static method is still unreachable');
      assert.match(output, /dead-code-assertion/);
    }
  );

  // With one -- as AdObserver does for IndexNowController::notifyAdChange -- the
  // method is live and must NOT be reported, or the checker would invite someone
  // to delete working production code.
  withRepo(
    {
      [CONTROLLER_PATH]: controller,
      [ROUTES_PATH]: "<?php\n",
      'backend/app/Observers/SomeObserver.php': [
        '<?php',
        'class SomeObserver',
        '{',
        '    public function created($ad)',
        '    {',
        "        FooController::notifyAdChange($ad);",
        '    }',
        '}',
        '',
      ].join('\n'),
      'scripts/static-ok-gate.mjs': guardAsserting("orderBy('foo.dead', 'asc')"),
    },
    ({ status, output }) => {
      assert.equal(status, 0, `a statically called method is reachable:\n${output}`);
    }
  );
});

/* ------------------------------------------------------------------ *
 * RC-3 -- the wrong observation surface
 * ------------------------------------------------------------------ */

test('negative control: a gate asserting an orphaned frontend module fails', () => {
  const base = {
    'src/main.jsx': "import Used from './used.jsx';\n",
    'src/used.jsx': 'export default function Used() { return null; }\n',
    'src/orphan.jsx': 'export default function Orphan() { return null; }\n',
  };

  // Control: the asserted module IS reachable from the entry point -> fine.
  withRepo(
    { ...base, 'scripts/reach-gate.sh': "#!/usr/bin/env bash\ngrep -qF 'export default' src/used.jsx\n" },
    ({ status, output }) => {
      assert.equal(status, 0, `a reachable asserted module must pass:\n${output}`);
    }
  );

  // The orphan never executes in the browser, so the gate observes an
  // intermediate artifact rather than the delivered page.
  withRepo(
    { ...base, 'scripts/orphan-gate.sh': "#!/usr/bin/env bash\ngrep -qF 'export default' src/orphan.jsx\n" },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'asserting an orphaned module must fail');
      assert.match(output, /asserted-orphan/);
      assert.match(output, /src\/orphan\.jsx/);
    }
  );
});

test('RC-3 orphan analysis is skipped rather than guessed when there is no entry point', () => {
  const root = fixtureRepo({
    'src/orphan.jsx': 'export default function Orphan() { return null; }\n',
    'scripts/orphan-gate.sh': "#!/usr/bin/env bash\ngrep -qF 'export default' src/orphan.jsx\n",
  });
  try {
    const { status, output } = runChecker(root);
    assert.equal(status, 0, `no entry point means no orphan verdict, not an accusation:\n${output}`);
    assert.match(output, /RC-3 orphan analysis skipped/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/* ------------------------------------------------------------------ *
 * RC-4 -- can the check actually fail?
 * ------------------------------------------------------------------ */

test('negative control: grep -q piped into grep -q is reported as never-failing', () => {
  const base = {
    'src/used.jsx': "const a = 'x';\nconst b = 'y';\n",
  };

  // Control: without -q on the left the pipeline can produce output.
  withRepo(
    {
      ...base,
      'scripts/pipeline-ok-gate.sh': "#!/usr/bin/env bash\nif grep -F a src/used.jsx | grep -qF b; then\n  echo matched\nfi\n",
    },
    ({ status, output }) => {
      assert.equal(status, 0, `a working pipeline must not be reported:\n${output}`);
    }
  );

  // `grep -q` writes no stdout, so the right-hand side always sees an empty
  // stream: the condition can never be true and the guard cannot fire.
  withRepo(
    {
      ...base,
      'scripts/pipeline-bad-gate.sh': "#!/usr/bin/env bash\nif grep -qF a src/used.jsx | grep -qF b; then\n  echo bad >&2\n  exit 1\nfi\n",
    },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'a never-failing condition must be reported');
      assert.match(output, /never-fails/);
      assert.match(output, /pipeline-bad-gate\.sh:2/);
    }
  );
});

test('never-fails ignores the pattern when it is commented out', () => {
  withRepo(
    {
      'src/used.jsx': "const a = 'x';\n",
      'scripts/commented-gate.sh': "#!/usr/bin/env bash\n# if grep -qF a src/used.jsx | grep -qF b; then\n",
    },
    ({ status, output }) => {
      assert.equal(status, 0, `a commented-out pattern is not a live defect:\n${output}`);
    }
  );
});

test('negative control: a gate with no control proves it can fail is reported', () => {
  const files = {
    'src/used.jsx': "const a = 'x';\n",
    'scripts/unproven-gate.sh': "#!/usr/bin/env bash\ngrep -qF a src/used.jsx\n",
  };

  // No baseline -> the gate is reported.
  const root = fixtureRepo(files);
  try {
    rmSync(join(root, 'scripts/gate-coverage-baseline.json'), { force: true });
    const { status, output } = runChecker(root);
    assert.notEqual(status, 0, 'a gate with no control must be reported');
    assert.match(output, /no-negative-control/);
    assert.match(output, /unproven-gate\.sh/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }

  // A companion control file satisfies the requirement. The baseline is empty on
  // purpose: if it still listed the gate, the entry would be stale (and reporting
  // that is the next test) rather than the control being accepted.
  withRepo(
    {
      ...files,
      'scripts/unproven-gate.test.sh': '#!/usr/bin/env bash\nexit 0\n',
      'scripts/gate-coverage-baseline.json': JSON.stringify({
        owner: 'fixture', recordedAt: '2026-01-01', reason: 'fixture', entries: [],
      }, null, 2),
    },
    ({ status, output }) => {
      assert.equal(status, 0, `a companion control must satisfy the check:\n${output}`);
    }
  );
});

test('negative control: a baseline entry that gained a control is stale', () => {
  // The baseline lists the gate, but the gate now HAS a companion control, so the
  // entry must be deleted -- the grandfathered population can only fall.
  const files = {
    'src/used.jsx': "const a = 'x';\n",
    'scripts/gained-gate.sh': "#!/usr/bin/env bash\ngrep -qF a src/used.jsx\n",
    'scripts/gained-gate.test.sh': '#!/usr/bin/env bash\nexit 0\n',
    'scripts/gate-coverage-baseline.json': JSON.stringify({
      owner: 'fixture',
      recordedAt: '2026-01-01',
      reason: 'fixture',
      entries: [{ check: 'no-negative-control', gate: 'scripts/gained-gate.sh' }],
    }, null, 2),
  };
  withRepo(files, ({ status, output }) => {
    assert.notEqual(status, 0, 'a baseline entry with no matching finding must fail');
    assert.match(output, /stale-baseline/);
  });
});

test('negative control: a gate with no control that is NOT baselined fails even when others are', () => {
  // The population may not grow: existing entries are grandfathered, new ones are not.
  const files = {
    'src/used.jsx': "const a = 'x';\n",
    'scripts/old-gate.sh': "#!/usr/bin/env bash\ngrep -qF a src/used.jsx\n",
    'scripts/new-gate.sh': "#!/usr/bin/env bash\ngrep -qF a src/used.jsx\n",
    'scripts/gate-coverage-baseline.json': JSON.stringify({
      owner: 'fixture',
      recordedAt: '2026-01-01',
      reason: 'fixture',
      entries: [{ check: 'no-negative-control', gate: 'scripts/old-gate.sh' }],
    }, null, 2),
  };
  withRepo(files, ({ status, output }) => {
    assert.notEqual(status, 0, 'a new gate without a control must fail');
    assert.match(output, /no-negative-control/);
    assert.match(output, /new-gate\.sh/);
    assert.doesNotMatch(output, /\[no-negative-control\] scripts\/old-gate\.sh/);
  });
});

/* ------------------------------------------------------------------ *
 * RC-2 -- advisory by design
 * ------------------------------------------------------------------ */

test('RC-2 code-derived-invariant is measured but never gates', () => {
  // A literal that is a fragment of the implementation it guards: the RC-2 shape.
  // It is reported in --audit output and must NOT fail the check, because "is this
  // invariant derived from intent?" is not mechanically decidable.
  const files = {
    'backend/app/Services/Thing.php': '<?php\nclass Thing\n{\n    public function go()\n    {\n        return $query->where(\'x\', 1);\n    }\n}\n',
    'scripts/impl-gate.sh': "#!/usr/bin/env bash\ngrep -qF \"->where('x', 1)\" backend/app/Services/Thing.php\n",
  };
  withRepo(files, ({ status, output }) => {
    assert.equal(status, 0, `the RC-2 shape must not gate:\n${output}`);
  });

  const root = fixtureRepo(files);
  try {
    const audit = runCheckerWithArgs(root, ['--audit']);
    assert.match(audit.output, /RC-2\s+code-derived-invariant\s+: 1/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/* ------------------------------------------------------------------ *
 * Review-round hardening: inactive text and shell-logic edge cases
 * ------------------------------------------------------------------ */

test('negative control: a NEGATIVE shell guard contributes its target to orphan analysis', () => {
  // `if grep -qF lit path; then fail; fi` is a claim about `path`, and the target
  // used to be dropped (and, before that, captured with its trailing semicolon).
  withRepo(
    {
      'src/main.jsx': "import './used.jsx';\n",
      'src/used.jsx': 'export default 1;\n',
      'src/orphan.jsx': 'export default 2;\n',
      'scripts/negative-gate.sh': [
        '#!/usr/bin/env bash',
        'set -euo pipefail',
        'if grep -qF "bad-marker" src/orphan.jsx; then',
        '  echo "must not contain bad-marker" >&2',
        '  exit 1',
        'fi',
        '',
      ].join('\n'),
    },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'a negative-only asserted target must be orphan-checked');
      assert.match(output, /asserted-orphan/);
      assert.match(output, /src\/orphan\.jsx/);
    }
  );
});

test('negative control: a commented-out import does not make a module reachable', () => {
  const base = { 'src/orphan.jsx': 'export default 2;\n' };
  // Quoted literals, as real gates write them: the shell parser reads
  // `grep -qF "lit" path`, and an unquoted literal is a documented limit.
  const gate = { 'scripts/comment-orphan-gate.sh': '#!/usr/bin/env bash\ngrep -qF "export default" src/orphan.jsx\n' };

  // Control: a real import makes it reachable.
  withRepo(
    { ...base, ...gate, 'src/main.jsx': "import './orphan.jsx';\n" },
    ({ status, output }) => {
      assert.equal(status, 0, `a real import must make the module reachable:\n${output}`);
    }
  );

  // `// import './orphan.jsx'` is not an import. Raw-text scanning used to count it.
  withRepo(
    { ...base, ...gate, 'src/main.jsx': "// import './orphan.jsx';\nimport './used.jsx';\n", 'src/used.jsx': 'export default 1;\n' },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'a commented-out import must not count as reachability');
      assert.match(output, /asserted-orphan/);
      assert.match(output, /src\/orphan\.jsx/);
    }
  );

  // Same for a block comment.
  withRepo(
    { ...base, ...gate, 'src/main.jsx': "/* import './orphan.jsx' */\nimport './used.jsx';\n", 'src/used.jsx': 'export default 1;\n' },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'a block-commented import must not count as reachability');
      assert.match(output, /asserted-orphan/);
    }
  );
});

test('computed imports keep their whole prefix directory reachable', () => {
  // `import(`./locales/${lang}.js`)` can load any module in that directory, so a
  // gate asserting one of them is observing shipped code, not an orphan.
  withRepo(
    {
      'src/main.jsx': "const load = (lang) => import(`./locales/${lang}.js`);\n",
      'src/locales/es.js': 'export default {};\n',
      'src/locales/ru.js': 'export default {};\n',
      'scripts/locale-gate.sh': '#!/usr/bin/env bash\ngrep -qF "export default" src/locales/ru.js\n',
    },
    ({ status, output }) => {
      assert.equal(status, 0, `a computed-import directory must be treated as reachable:\n${output}`);
    }
  );
});

test('negative control: an orphaned .mjs module is audited too', () => {
  // The graph resolves `.mjs`, so the audit must judge `.mjs` targets as well.
  withRepo(
    {
      'src/main.jsx': "import './used.jsx';\n",
      'src/used.jsx': 'export default 1;\n',
      'src/helper.mjs': 'export const x = 1;\n',
      'scripts/mjs-gate.sh': '#!/usr/bin/env bash\ngrep -qF "export const" src/helper.mjs\n',
    },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'an orphaned .mjs module must be reported');
      assert.match(output, /asserted-orphan/);
      assert.match(output, /src\/helper\.mjs/);
    }
  );
});

test('negative control: a pipeline continued with a backslash cannot escape never-fails', () => {
  const base = { 'src/used.jsx': "const a = 'x';\n" };

  // Control: a legitimate two-line pipeline is not reported.
  withRepo(
    {
      ...base,
      'scripts/continued-ok-gate.sh': '#!/usr/bin/env bash\nif grep -F a src/used.jsx \\\n  | grep -qF b; then\n  echo ok\nfi\n',
    },
    ({ status, output }) => {
      assert.equal(status, 0, `a working continued pipeline must not be reported:\n${output}`);
    }
  );

  // The same pipeline as a dead one: `grep -q` on the left of a continuation.
  withRepo(
    {
      ...base,
      'scripts/continued-bad-gate.sh': '#!/usr/bin/env bash\nif grep -qF a src/used.jsx \\\n  | grep -qF b; then\n  echo bad >&2\n  exit 1\nfi\n',
    },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'a continued never-failing pipeline must be reported');
      assert.match(output, /never-fails/);
    }
  );
});

test('negative control: a malformed baseline entry is reported without crashing', () => {
  const files = {
    'src/used.jsx': "const a = 'x';\n",
    'scripts/ok-gate.sh': '#!/usr/bin/env bash\ngrep -qF a src/used.jsx\n',
    // Valid JSON, malformed entry: used to throw a TypeError and break --json.
    'scripts/gate-coverage-baseline.json': JSON.stringify({
      owner: 'fixture', recordedAt: '2026-01-01', reason: 'fixture', entries: [null, 'nope', { check: 'no-negative-control' }],
    }, null, 2),
  };
  withRepo(files, ({ status, output }) => {
    assert.notEqual(status, 0, 'malformed baseline entries must be reported');
    assert.match(output, /invalid-baseline/);
    assert.match(output, /no-negative-control/);
  });

  const root = fixtureRepo(files);
  try {
    const json = runCheckerWithArgs(root, ['--json']);
    assert.doesNotThrow(() => JSON.parse(json.output), '--json must emit a machine-readable report, not a stack trace');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('in-gate assertion programs count as control evidence', () => {
  // A suffixed heredoc delimiter (real gates use `PY_EXPIRY`) and a standalone
  // .mjs assertion gate both prove their own assertions.
  const noBaseline = {
    'scripts/gate-coverage-baseline.json': JSON.stringify({
      owner: 'fixture', recordedAt: '2026-01-01', reason: 'fixture', entries: [],
    }, null, 2),
  };

  withRepo(
    {
      ...noBaseline,
      'src/used.jsx': "const a = 'x';\n",
      'scripts/heredoc-gate.sh': [
        '#!/usr/bin/env bash',
        'set -euo pipefail',
        "python3 - <<'PY_EXPIRY'",
        'import sys',
        'assert 1 == 1',
        'sys.exit(0)',
        'PY_EXPIRY',
        '',
      ].join('\n'),
    },
    ({ status, output }) => {
      assert.equal(status, 0, `a suffixed heredoc assertion program is a control:\n${output}`);
    }
  );

  withRepo(
    {
      ...noBaseline,
      'src/used.jsx': "const a = 'x';\n",
      'scripts/standalone-contract.mjs': [
        "import assert from 'node:assert/strict';",
        'assert.deepStrictEqual(1, 1);',
        '',
      ].join('\n'),
    },
    ({ status, output }) => {
      assert.equal(status, 0, `a standalone .mjs assertion gate is a control:\n${output}`);
    }
  );
});

/* ------------------------------------------------------------------ *
 * Review round 3: executable-syntax-only detection and false positives
 * ------------------------------------------------------------------ */

test('negative control: an import written inside a STRING is not an import', () => {
  const gate = { 'scripts/str-orphan-gate.sh': '#!/usr/bin/env bash\ngrep -qF "export default" src/orphan.jsx\n' };

  // A path inside a string literal is data, not an edge. Raw-text scanning counted
  // it and hid the orphan -- the exact false negative this check exists to prevent.
  withRepo(
    {
      'src/main.jsx': 'import "./used.jsx";\nconst help = "import \'./orphan.jsx\'";\n',
      'src/used.jsx': 'export default 1;\n',
      'src/orphan.jsx': 'export default 2;\n',
      ...gate,
    },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'a string mentioning an import must not create reachability');
      assert.match(output, /asserted-orphan/);
      assert.match(output, /src\/orphan\.jsx/);
    }
  );

  // Positive control: a real import still counts.
  withRepo(
    {
      'src/main.jsx': 'import "./orphan.jsx";\n',
      'src/orphan.jsx': 'export default 2;\n',
      ...gate,
    },
    ({ status, output }) => {
      assert.equal(status, 0, `a real import must keep the module reachable:\n${output}`);
    }
  );
});

test('negative control: a commented-out control is not control evidence', () => {
  const emptyBaseline = {
    'scripts/gate-coverage-baseline.json': JSON.stringify({
      owner: 'fixture', recordedAt: '2026-01-01', reason: 'fixture', entries: [],
    }, null, 2),
  };

  // `# run node --test ...` proves nothing: the gate cannot fail.
  withRepo(
    {
      'src/used.jsx': 'export default 1;\n',
      'scripts/commented-control.sh': '#!/usr/bin/env bash\n# run node --test tests/nothing.test.mjs\necho ok\n',
      ...emptyBaseline,
    },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'a commented-out control must not satisfy the requirement');
      assert.match(output, /no-negative-control/);
    }
  );

  // The same for a commented-out JS assertion.
  withRepo(
    {
      'src/used.jsx': 'export default 1;\n',
      'scripts/commented-contract.mjs': "// import assert from 'node:assert';\n// assert.deepStrictEqual(1, 1);\nconsole.log('ok');\n",
      ...emptyBaseline,
    },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'a commented-out assertion must not satisfy the requirement');
      assert.match(output, /no-negative-control/);
    }
  );

  // Positive control: an ACTIVE in-gate program is evidence.
  withRepo(
    {
      'src/used.jsx': 'export default 1;\n',
      'scripts/live-control.sh': '#!/usr/bin/env bash\nset -euo pipefail\nnode --test tests/gate-integrity-contract.test.mjs >/dev/null\n',
      ...emptyBaseline,
    },
    ({ status, output }) => {
      assert.equal(status, 0, `a real in-gate control must be accepted:\n${output}`);
    }
  );
});

test('negative control: every grep target in a chained shell command is collected', () => {
  withRepo(
    {
      'src/main.jsx': 'import "./live.jsx";\n',
      'src/live.jsx': 'export default 1;\n',
      'src/orphan.jsx': 'export default 2;\n',
      'scripts/chained-gate.sh': [
        '#!/usr/bin/env bash',
        'grep -qF "export default" src/live.jsx && grep -qF "export default" src/orphan.jsx',
        '',
      ].join('\n'),
    },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'the second target in a chained command must be audited');
      assert.match(output, /asserted-orphan/);
      assert.match(output, /src\/orphan\.jsx/);
    }
  );
});

test('a pipeline whose consumer names a file is not a never-failing pipeline', () => {
  const base = { 'src/used.jsx': 'export default 1;\n', 'first.txt': 'a\n', 'second.txt': 'b\n' };

  // The consumer reads second.txt, so the pipeline can succeed.
  withRepo(
    { ...base, 'scripts/file-consumer.sh': '#!/usr/bin/env bash\nif grep -qF a first.txt | grep -qF b second.txt; then exit 1; fi\n' },
    ({ status, output }) => {
      assert.equal(status, 0, `a consumer with its own file must not be reported:\n${output}`);
    }
  );

  // Positive control: a stdin consumer is still reported.
  withRepo(
    { ...base, 'scripts/stdin-consumer.sh': '#!/usr/bin/env bash\nif grep -qF a src/used.jsx | grep -qF b; then exit 1; fi\n' },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'a stdin consumer must still be reported');
      assert.match(output, /never-fails/);
    }
  );
});

test('a control in a nested tests directory is found', () => {
  const files = {
    'src/used.jsx': 'export default 1;\n',
    'scripts/nested-control.sh': '#!/usr/bin/env bash\ngrep -qF "export default" src/used.jsx\n',
    // No auto baseline: an explicit empty one, so a missing control would be reported.
    'scripts/gate-coverage-baseline.json': JSON.stringify({
      owner: 'fixture', recordedAt: '2026-01-01', reason: 'fixture', entries: [],
    }, null, 2),
  };

  withRepo(
    { ...files, 'tests/gates/nested-control.test.mjs': '// control for scripts/nested-control.sh\n' },
    ({ status, output }) => {
      assert.equal(status, 0, `a nested tests/ control must satisfy the requirement:\n${output}`);
    }
  );

  // Positive control: with no control anywhere, the gate is still reported.
  withRepo(files, ({ status, output }) => {
    assert.notEqual(status, 0, 'a gate with no control anywhere must be reported');
    assert.match(output, /no-negative-control/);
  });
});

test('an extensionless import resolving to a directory index is reachable', () => {
  withRepo(
    {
      'src/main.jsx': 'import "./feature";\n',
      'src/feature/index.jsx': 'export default 1;\n',
      'scripts/index-gate.sh': '#!/usr/bin/env bash\ngrep -qF "export default" src/feature/index.jsx\n',
    },
    ({ status, output }) => {
      assert.equal(status, 0, `a directory index module must be reachable:\n${output}`);
    }
  );
});

test('alias usage disables orphan verdicts instead of inventing one', () => {
  const files = {
    'src/main.jsx': "import Screen from '@/screens/Screen.jsx';\n",
    'src/screens/Screen.jsx': 'export default 1;\n',
    'scripts/alias-gate.sh': '#!/usr/bin/env bash\ngrep -qF "export default" src/screens/Screen.jsx\n',
  };

  // With an alias configured, the aliased module cannot be resolved from the
  // repository alone: skip verdicts with a note rather than accuse.
  withRepo(
    { ...files, 'vite.config.js': "export default { resolve: { alias: { '@': '/src' } } };\n" },
    ({ status, output }) => {
      assert.equal(status, 0, `alias usage must not produce a false orphan:\n${output}`);
      assert.match(output, /RC-3 orphan analysis skipped/);
    }
  );

  // Positive control: without the alias the orphan analysis runs and reports.
  withRepo(
    {
      'src/main.jsx': 'import "./used.jsx";\n',
      'src/used.jsx': 'export default 1;\n',
      'src/orphan.jsx': 'export default 2;\n',
      'scripts/no-alias-gate.sh': '#!/usr/bin/env bash\ngrep -qF "export default" src/orphan.jsx\n',
    },
    ({ status, output }) => {
      assert.notEqual(status, 0, 'without aliases the orphan must still be reported');
      assert.match(output, /asserted-orphan/);
    }
  );
});

test('negative control: a gate-not-triggered waiver must name its target', () => {
  const files = {
    'backend/routes/api.php': '<?php\n',
    [GUARD_PATH]: guardAsserting('<?php', 'backend/routes/api.php'),
    '.github/workflows/guard.yml': [
      'name: Fixture', 'on:', '  pull_request:', '    paths:', "      - 'scripts/**'",
      'jobs:', '  check:', '    steps:', `      - run: node ${GUARD_PATH}`, '',
    ].join('\n'),
    'scripts/gate-integrity-waivers.json': JSON.stringify({
      waivers: [{
        check: 'gate-not-triggered',
        gate: GUARD_PATH,
        owner: 'owner',
        reason: 'no target supplied',
      }],
    }, null, 2),
  };
  withRepo(files, ({ status, output }) => {
    assert.notEqual(status, 0, 'a gate-not-triggered waiver without a target must be rejected');
    assert.match(output, /invalid-waiver/);
    assert.match(output, /target is required for a gate-not-triggered waiver/);
    // The redundant stale-waiver line is suppressed: the waiver never applied.
    assert.doesNotMatch(output, /stale-waiver/);
    // And the underlying violation must still surface.
    assert.match(output, /gate-not-triggered/);
  });
});
