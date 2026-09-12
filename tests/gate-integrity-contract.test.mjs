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
