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

  return root;
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
