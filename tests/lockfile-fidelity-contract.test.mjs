import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Contract tests for scripts/check-lockfile-fidelity.mjs (rule E5).
 *
 * The check exists because the required "Live server gate verify_quick" ran
 * `npm run verify:quick` against a host tree that had drifted from
 * package-lock.json, so a required check on every PR validated dependencies that
 * neither CI nor production builds from. These tests prove the check can fail:
 * a checker that cannot fail is worse than no checker.
 */

const CHECKER = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'check-lockfile-fidelity.mjs');

/** Builds a scratch tree from a package spec, optionally with installed packages. */
function scratch({ lock, installed, writeLock = true, lockRaw = null, nodeModulesIsFile = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'lockfile-fidelity-'));

  if (writeLock) {
    writeFileSync(
      join(root, 'package-lock.json'),
      lockRaw ?? JSON.stringify(lock ?? { lockfileVersion: 3, packages: { '': { name: 'x' } } }, null, 2)
    );
  }

  if (nodeModulesIsFile) {
    writeFileSync(join(root, 'node_modules'), 'not a directory\n');
  } else if (installed) {
    mkdirSync(join(root, 'node_modules'), { recursive: true });
    for (const [name, version] of Object.entries(installed)) {
      const dir = join(root, 'node_modules', name);
      mkdirSync(dir, { recursive: true });
      // `null` version simulates an unreadable manifest.
      writeFileSync(
        join(dir, 'package.json'),
        version === null ? '{ not json' : JSON.stringify({ name, version })
      );
    }
  }

  return root;
}

function runChecker(dir) {
  try {
    const stdout = execFileSync(process.execPath, [CHECKER, '--dir', dir], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    return { status: error.status, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
}

const lockWith = (entries) => ({
  lockfileVersion: 3,
  packages: Object.fromEntries([
    ['', { name: 'x', version: '1.0.0' }],
    ...Object.entries(entries).map(([name, meta]) => [`node_modules/${name}`, meta]),
  ]),
});

test('passes when the installed tree matches the lock exactly', () => {
  const root = scratch({
    lock: lockWith({ alpha: { version: '1.2.3' }, beta: { version: '4.5.6' } }),
    installed: { alpha: '1.2.3', beta: '4.5.6' },
  });
  try {
    const { status, stdout } = runChecker(root);
    assert.equal(status, 0, `expected a faithful tree to pass, got:\n${stdout}`);
    assert.match(stdout, /OK: 2 top-level packages match package-lock\.json/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('negative control: drift fails and names expected vs installed', () => {
  const root = scratch({
    lock: lockWith({ 'react-router-dom': { version: '7.18.3' }, 'lucide-react': { version: '1.43.0' } }),
    installed: { 'react-router-dom': '7.18.2', 'lucide-react': '1.35.0' },
  });
  try {
    const { status, stderr } = runChecker(root);
    assert.notEqual(status, 0, 'drift must fail the check');
    assert.match(stderr, /NOT lockfile-faithful/);
    assert.match(stderr, /react-router-dom\s+7\.18\.3\s+7\.18\.2/);
    assert.match(stderr, /lucide-react\s+1\.43\.0\s+1\.35\.0/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('negative control: a missing NON-optional package fails', () => {
  const root = scratch({
    lock: lockWith({ alpha: { version: '1.0.0' }, gone: { version: '2.0.0' } }),
    installed: { alpha: '1.0.0' },
  });
  try {
    const { status, stderr } = runChecker(root);
    assert.notEqual(status, 0, 'a missing required package must fail');
    assert.match(stderr, /missing\s+: 1/);
    assert.match(stderr, /gone\s+2\.0\.0\s+\(not installed\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a platform-gated optional package may be absent without failing', () => {
  // fsevents is os:["darwin"]; npm ci legitimately skips it on linux.
  const root = scratch({
    lock: lockWith({ alpha: { version: '1.0.0' }, fsevents: { version: '2.3.3', optional: true, os: ['darwin'] } }),
    installed: { alpha: '1.0.0' },
  });
  try {
    const { status, stdout } = runChecker(root);
    assert.equal(status, 0, `an absent optional package must not fail:\n${stdout}`);
    assert.match(stdout, /1 platform-gated optional package\(s\) absent/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('negative control: an INSTALLED optional package with the wrong version still fails', () => {
  const root = scratch({
    lock: lockWith({ fsevents: { version: '2.3.3', optional: true } }),
    installed: { fsevents: '2.3.1' },
  });
  try {
    const { status, stderr } = runChecker(root);
    assert.notEqual(status, 0, 'optional packages that are present must still match the lock');
    assert.match(stderr, /fsevents\s+2\.3\.3\s+2\.3\.1/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('negative control: "cannot determine" is a failure, not a pass', () => {
  // node_modules absent.
  const noModules = scratch({ lock: lockWith({ alpha: { version: '1.0.0' } }) });
  // lockfile absent.
  const noLock = scratch({ installed: { alpha: '1.0.0' }, writeLock: false });
  // lockfile present but not JSON.
  const badLock = scratch({ lockRaw: '{ not json', installed: { alpha: '1.0.0' } });
  // lockfileVersion 1 (no `packages` map).
  const v1Lock = scratch({ lockRaw: JSON.stringify({ lockfileVersion: 1, dependencies: {} }), installed: { alpha: '1.0.0' } });
  // manifest present but unreadable.
  const badManifest = scratch({ lock: lockWith({ alpha: { version: '1.0.0' } }), installed: { alpha: null } });
  // node_modules exists but is a file, not a directory.
  const modulesIsFile = scratch({ lock: lockWith({ alpha: { version: '1.0.0' } }), nodeModulesIsFile: true });

  try {
    for (const [label, root, expected] of [
      ['node_modules absent', noModules, /node_modules is absent/],
      ['lockfile absent', noLock, /package-lock\.json is missing/],
      ['lockfile not JSON', badLock, /unreadable or not valid JSON/],
      ['lockfileVersion 1', v1Lock, /unsupported lockfile format/],
      ['manifest unreadable', badManifest, /unreadable\s+: 1/],
      ['node_modules is a file', modulesIsFile, /node_modules is not a directory/],
    ]) {
      const { status, stderr } = runChecker(root);
      assert.notEqual(status, 0, `${label} must fail closed`);
      assert.match(stderr, expected, `${label} should explain the reason`);
    }
  } finally {
    for (const root of [noModules, noLock, badLock, v1Lock, badManifest, modulesIsFile]) {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test('--json emits a machine-readable verdict', () => {
  const root = scratch({
    lock: lockWith({ alpha: { version: '1.0.0' } }),
    installed: { alpha: '0.9.0' },
  });
  try {
    let payload;
    try {
      execFileSync(process.execPath, [CHECKER, '--dir', root, '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      assert.fail('a drifted tree must exit non-zero');
    } catch (error) {
      payload = JSON.parse(error.stdout);
    }
    assert.equal(payload.faithful, false);
    assert.equal(payload.outcome, 'unfaithful');
    assert.deepEqual(payload.drift, [{ name: 'alpha', expected: '1.0.0', actual: '0.9.0' }]);
    assert.match(payload.remediation, /npm ci/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the real repository checkout is lockfile-faithful', () => {
  // Guards against the failure mode itself: if the working tree this test runs in
  // has drifted, that is a real finding and this test should say so.
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const { status, stdout, stderr } = runChecker(repoRoot);
  if (status !== 0) {
    // A worktree with no node_modules installed is "cannot determine", which is a
    // legitimate local state; only report drift/missing as a failure.
    assert.match(
      stderr,
      /node_modules is absent|cannot determine/,
      `the repository checkout is not lockfile-faithful:\n${stderr}`
    );
    return;
  }
  assert.match(stdout, /match package-lock\.json/);
});
