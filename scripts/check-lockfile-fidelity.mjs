#!/usr/bin/env node
/**
 * Lockfile fidelity check (rule E5 - environment fidelity).
 *
 * Why this exists
 * ---------------
 * `scripts/server-operator.sh` runs `npm run verify:quick` inside the long-lived
 * host checkout `/var/www/mercasto`. That command is the required check
 * "Live server gate verify_quick" on every pull request. The host `node_modules`
 * had silently drifted from `package-lock.json` (react-router-dom 7.18.2 vs
 * locked 7.18.3, lucide-react 1.35.0 vs 1.43.0, 24 of ~317 top-level packages),
 * so a required gate was validating a dependency set that neither CI nor
 * production builds from. Green, and about the wrong artifact - the same class
 * of defect as a gate that asserts dead code.
 *
 * Why not `npm ls`
 * ----------------
 * `npm ls` reports problems relative to the semver RANGES in package.json, not
 * against the lockfile. In-range drift is exactly what happened here: 7.18.2
 * satisfies `^7.18.0`, so `npm ls` exits 0 on a drifted tree. A check that
 * compares ranges cannot detect a lockfile-fidelity violation. This script
 * compares the INSTALLED tree against the EXACT versions in package-lock.json.
 *
 * Fail-closed contract
 * --------------------
 * "Cannot determine" is a FAILURE, never a pass. A missing or unreadable
 * package-lock.json, an unsupported lockfile version, an absent node_modules, or
 * a package whose installed version cannot be read all exit non-zero. A gate
 * that cannot tell whether the tree is faithful must not report success.
 *
 * Read-only
 * ---------
 * This script never installs, never writes, and never touches the network. It
 * runs on the production host as part of a read-only operation, so repairing the
 * tree is deliberately left to a human or an explicit operation.
 *
 * Usage
 *   node scripts/check-lockfile-fidelity.mjs [--dir <path>] [--json] [--quiet]
 *
 * Exit codes
 *   0  the installed tree matches package-lock.json exactly
 *   1  drift, a missing package, or "cannot determine"
 *   64 usage error
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const EXIT_OK = 0;
const EXIT_UNFAITHFUL = 1;
const EXIT_USAGE = 64;

const REMEDIATION = 'cd /var/www/mercasto && npm ci';

function parseArgs(argv) {
  const options = { dir: process.cwd(), json: false, quiet: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dir') {
      const value = argv[i + 1];
      if (!value) return { error: '--dir requires a path' };
      options.dir = value;
      i += 1;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--quiet') {
      options.quiet = true;
    } else if (arg === '--help' || arg === '-h') {
      return { help: true };
    } else {
      return { error: `unknown argument: ${arg}` };
    }
  }
  return options;
}

function fail(options, reason, detail) {
  const payload = {
    faithful: false,
    outcome: reason,
    directory: options.dir,
    detail,
    drift: [],
    missing: [],
    remediation: REMEDIATION,
  };
  if (options.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stderr.write('== Lockfile fidelity check (rule E5) ==\n');
    process.stderr.write('FAIL: cannot determine whether this tree is lockfile-faithful.\n\n');
    process.stderr.write(`  reason : ${reason}\n`);
    if (detail) process.stderr.write(`  detail : ${detail}\n`);
    process.stderr.write(`  tree   : ${options.dir}\n\n`);
    process.stderr.write('Results produced from this tree are NOT evidence: the environment is not\n');
    process.stderr.write('lockfile-faithful, so it is not the artifact under test.\n\n');
    process.stderr.write(`Fix it on the host, then re-run:\n  ${REMEDIATION}\n`);
    process.stderr.write('This check is read-only and will not install for you.\n');
  }
  return EXIT_UNFAITHFUL;
}

/**
 * Reads package.json for one installed package, or reports why it could not.
 *
 * Deliberately a single read attempt rather than exists/stat-then-read: the
 * check-then-use sequence is a TOCTOU race (CodeQL flagged it) and the extra
 * syscalls buy nothing. A missing package comes back as ENOENT/EISDIR/ENOTDIR;
 * anything else (unparseable manifest, permissions) is "unreadable", which the
 * caller treats as a failure rather than a pass.
 */
function readInstalledVersion(nodeModulesDir, name) {
  const manifest = join(nodeModulesDir, name, 'package.json');
  let raw;
  try {
    raw = readFileSync(manifest, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR' || error.code === 'ENOTDIR') {
      return { state: 'missing', path: manifest };
    }
    return { state: 'unreadable', path: manifest, reason: error.message };
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.version !== 'string' || parsed.version === '') {
      return { state: 'unreadable', path: manifest, reason: 'no version field' };
    }
    return { state: 'ok', version: parsed.version, path: manifest };
  } catch (error) {
    return { state: 'unreadable', path: manifest, reason: error.message };
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('usage: node scripts/check-lockfile-fidelity.mjs [--dir <path>] [--json] [--quiet]\n');
    return EXIT_OK;
  }
  if (options.error) {
    process.stderr.write(`check-lockfile-fidelity: ${options.error}\n`);
    return EXIT_USAGE;
  }
  options.dir = resolve(options.dir);

  const lockPath = join(options.dir, 'package-lock.json');
  let lockRaw;
  try {
    lockRaw = readFileSync(lockPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR' || error.code === 'ENOTDIR') {
      return fail(options, 'package-lock.json is missing', lockPath);
    }
    return fail(options, 'package-lock.json is unreadable or not valid JSON', error.message);
  }

  let lock;
  try {
    lock = JSON.parse(lockRaw);
  } catch (error) {
    return fail(options, 'package-lock.json is unreadable or not valid JSON', error.message);
  }

  if (!lock || typeof lock.packages !== 'object' || lock.packages === null) {
    return fail(
      options,
      `unsupported lockfile format (lockfileVersion ${lock?.lockfileVersion ?? 'unknown'})`,
      'expected lockfileVersion 2 or 3 with a "packages" map; cannot compare against a v1 dependency tree'
    );
  }

  // One readdir attempt rather than exists/stat-then-readdir, for the same
  // check-then-use reason as readInstalledVersion. ENOENT means absent, ENOTDIR
  // means it is not a directory, and anything else is "cannot determine".
  const nodeModulesDir = join(options.dir, 'node_modules');
  let nodeModulesEntries;
  try {
    nodeModulesEntries = readdirSync(nodeModulesDir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fail(options, 'node_modules is absent', nodeModulesDir);
    }
    if (error.code === 'ENOTDIR') {
      return fail(options, 'node_modules is not a directory', nodeModulesDir);
    }
    return fail(options, 'node_modules is unreadable', error.message);
  }
  if (nodeModulesEntries.length === 0) {
    return fail(options, 'node_modules is empty', nodeModulesDir);
  }

  // Only true top-level entries: "node_modules/<name>" or "node_modules/@scope/<name>".
  const topLevelPattern = /^node_modules\/(@[^/]+\/[^/]+|[^/]+)$/;
  const drift = [];
  const missing = [];
  const unreadable = [];
  let compared = 0;
  let skipped = 0;
  let optionalAbsent = 0;

  for (const [key, entry] of Object.entries(lock.packages)) {
    const match = topLevelPattern.exec(key);
    if (!match) continue;

    const expected = entry?.version;
    // `link:`/`file:` entries carry no version and are not npm-registry installs.
    if (typeof expected !== 'string' || expected === '') {
      skipped += 1;
      continue;
    }

    const name = match[1];
    const installed = readInstalledVersion(nodeModulesDir, name);
    if (installed.state === 'missing') {
      // npm ci legitimately omits platform-gated optional dependencies that do not
      // match this host (fsevents is os:["darwin"]; the rolldown/lightningcss/
      // tailwindcss oxide and @sentry/cli binaries are per-arch). Their absence is
      // the expected outcome of a correct `npm ci`, not drift. An optional package
      // that IS installed is still compared exactly below, so a wrong version is
      // always caught. Every non-optional absence is still a failure.
      if (entry?.optional === true) {
        optionalAbsent += 1;
        continue;
      }
      missing.push({ name, expected });
      continue;
    }
    if (installed.state === 'unreadable') {
      unreadable.push({ name, expected, reason: installed.reason });
      continue;
    }

    compared += 1;
    if (installed.version !== expected) {
      drift.push({ name, expected, actual: installed.version });
    }
  }

  const unfaithful = drift.length > 0 || missing.length > 0 || unreadable.length > 0;
  const summary = {
    faithful: !unfaithful,
    outcome: unfaithful ? 'unfaithful' : 'faithful',
    directory: options.dir,
    lockfileVersion: lock.lockfileVersion,
    topLevelEntries: compared + missing.length + unreadable.length,
    compared,
    skipped,
    optionalAbsent,
    drift,
    missing,
    unreadable,
    remediation: unfaithful ? REMEDIATION : null,
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return unfaithful ? EXIT_UNFAITHFUL : EXIT_OK;
  }

  if (!unfaithful) {
    if (!options.quiet) {
      process.stdout.write('== Lockfile fidelity check (rule E5) ==\n');
      process.stdout.write(
        `OK: ${compared} top-level packages match package-lock.json (lockfileVersion ${lock.lockfileVersion}).\n`
      );
      if (optionalAbsent > 0) {
        process.stdout.write(
          `${optionalAbsent} platform-gated optional package(s) absent, as expected for this host.\n`
        );
      }
      process.stdout.write(`tree: ${nodeModulesDir}\n`);
    }
    return EXIT_OK;
  }

  const out = process.stderr;
  out.write('== Lockfile fidelity check (rule E5) ==\n');
  out.write('FAIL: node_modules is NOT lockfile-faithful.\n\n');
  out.write(`  tree         : ${nodeModulesDir}\n`);
  out.write(`  package-lock : ${lockPath} (lockfileVersion ${lock.lockfileVersion})\n`);
  out.write(`  compared     : ${compared} top-level packages\n`);
  out.write(`  drifted      : ${drift.length}\n`);
  out.write(`  missing      : ${missing.length}\n`);
  out.write(`  unreadable   : ${unreadable.length}\n\n`);

  const rows = [
    ...drift.map((row) => [row.name, row.expected, row.actual]),
    ...missing.map((row) => [row.name, row.expected, '(not installed)']),
    ...unreadable.map((row) => [row.name, row.expected, `(unreadable: ${row.reason})`]),
  ];
  const nameWidth = Math.min(48, Math.max(7, ...rows.map((row) => row[0].length)));
  const expectedWidth = Math.max(8, ...rows.map((row) => row[1].length));
  out.write(`${'package'.padEnd(nameWidth)}  ${'expected (lock)'.padEnd(expectedWidth)}  installed\n`);
  for (const [name, expected, actual] of rows.slice(0, 40)) {
    out.write(`${name.padEnd(nameWidth)}  ${expected.padEnd(expectedWidth)}  ${actual}\n`);
  }
  if (rows.length > 40) out.write(`... and ${rows.length - 40} more\n`);
  out.write('\n');

  out.write('Results produced from this tree are NOT evidence: the dependency set is not the one\n');
  out.write('package-lock.json pins, so this is not the artifact CI and production build from.\n');
  out.write('A build from this tree does not fingerprint the same vendor chunk as production.\n\n');
  out.write('Fix it on the host, then re-run:\n');
  out.write(`  ${REMEDIATION}\n`);
  out.write('This check is read-only and will not install for you.\n');

  return EXIT_UNFAITHFUL;
}

process.exit(main());
