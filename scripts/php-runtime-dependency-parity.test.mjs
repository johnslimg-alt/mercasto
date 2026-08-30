import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const smoke = readFileSync('scripts/php-runtime-dependency-parity-smoke.sh', 'utf8');
const deploy = readFileSync('.github/workflows/deploy-selfhosted.yml', 'utf8');
const operator = readFileSync('scripts/server-operator.sh', 'utf8');
const runtimes = [
  'mercasto-backend',
  'mercasto-worker',
  'mercasto-scheduler',
  'mercasto-reverb',
];

function runFixture(extraEnv = {}) {
  const fixture = mkdtempSync(join(tmpdir(), 'mercasto-runtime-parity-'));
  const docker = join(fixture, 'docker');
  writeFileSync(docker, `#!/usr/bin/env bash
set -euo pipefail
if [ "$1" = inspect ]; then
  container="\${@: -1}"
  if [ "\${DOWN_CONTAINER:-}" = "$container" ]; then echo restarting; else echo running; fi
  exit 0
fi
if [ "$1" = exec ]; then
  container="$2"
  if [ "\${MISMATCH_CONTAINER:-}" = "$container" ]; then
    printf 'v13.8.0\\tlegacy-fingerprint\\n'
  else
    printf 'v13.29.0\\tcurrent-fingerprint\\n'
  fi
  exit 0
fi
exit 64
`);
  chmodSync(docker, 0o755);
  try {
    return spawnSync('bash', ['scripts/php-runtime-dependency-parity-smoke.sh'], {
      encoding: 'utf8',
      env: { ...process.env, DOCKER_BIN: docker, ...extraEnv },
    });
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

test('runtime parity smoke accepts four identical PHP dependency snapshots', () => {
  const result = runFixture();
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PHP_RUNTIME_PARITY=PASS laravel=v13\.29\.0/);
  assert.equal((result.stdout.match(/PHP_RUNTIME_PARITY_MEMBER/g) || []).length, 4);
});

test('runtime parity smoke rejects a stale runtime vendor snapshot', () => {
  const result = runFixture({ MISMATCH_CONTAINER: 'mercasto_worker_container' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /PHP_RUNTIME_PARITY=FAIL container=mercasto_worker_container/);
});

test('runtime parity smoke rejects a restarting runtime before reading vendor state', () => {
  const result = runFixture({ DOWN_CONTAINER: 'mercasto_reverb_container' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /container=mercasto_reverb_container state=restarting/);
});

test('production deploy refreshes every PHP runtime vendor volume atomically', () => {
  assert.match(deploy, /PHP_RUNTIME_SERVICES="mercasto-backend mercasto-worker mercasto-scheduler mercasto-reverb"/);
  assert.match(deploy, /PHP_DEPENDENCY_REFRESH=1/);
  assert.match(deploy, /bash scripts\/php-runtime-dependency-parity-smoke\.sh/);
  assert.match(deploy, /--force-recreate --renew-anon-volumes \$PHP_REFRESH_SERVICES/);
  for (const runtime of runtimes) assert.match(deploy, new RegExp(runtime));
  assert.match(operator, /up -d --build --remove-orphans --renew-anon-volumes/);
});
