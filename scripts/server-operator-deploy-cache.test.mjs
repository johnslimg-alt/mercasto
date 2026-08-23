import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const operator = readFileSync('scripts/server-operator.sh', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

function deployMainBlock() {
  const start = operator.indexOf('  deploy_main)');
  const end = operator.indexOf('  restart_frontend)', start);
  assert.ok(start >= 0 && end > start, 'deploy_main case block must exist');
  return operator.slice(start, end);
}

test('deploy clears stale Laravel caches before recreating containers', () => {
  assert.match(operator, /clear_laravel_bootstrap_caches\(\)/);
  assert.match(operator, /rm -f "\$cache_dir\/config\.php" "\$cache_dir\/events\.php"/);
  assert.match(operator, /find "\$cache_dir" -maxdepth 1 -type f -name 'routes-\*\.php' -delete/);

  const deploy = deployMainBlock();
  const reset = deploy.indexOf('git reset --hard origin/main');
  const clear = deploy.indexOf('clear_laravel_bootstrap_caches');
  const startStack = deploy.indexOf('up -d --build --remove-orphans');
  assert.ok(reset >= 0 && reset < clear && clear < startStack, 'cache clear must happen after sync and before stack start');
});

test('production deploy uses the existing narrow sudo boundary for root-owned checkout mutation', () => {
  assert.match(operator, /is_production_checkout\(\)/);
  assert.match(operator, /\[ "\$PROJECT_DIR" = "\/var\/www\/mercasto" \]/);

  const deploy = deployMainBlock();
  assert.match(deploy, /sudo -n git fetch origin/);
  assert.match(deploy, /sudo -n git reset --hard origin\/main/);
  assert.match(deploy, /sudo -n git clean -fd -e runners\/data1 -e runners\/data2 -e runners\/data3 -e runners\/\.env/);
  assert.match(operator, /sudo -n rm -f backend\/bootstrap\/cache\/\*\.php/);
  assert.match(deploy, /else\n\s+git fetch origin main --prune/);
  assert.doesNotMatch(operator, /chown\s+-R|chmod\s+-R/);
});

test('deploy refreshes Laravel caches after migrations and before verification', () => {
  assert.match(operator, /refresh_laravel_bootstrap_caches\(\)/);
  assert.match(operator, /php artisan optimize/);
  assert.doesNotMatch(operator, /php artisan optimize:clear/);
  assert.match(operator, /nginx_reload_upstreams\(\)/);
  assert.match(operator, /nginx -s reload/);

  const deploy = deployMainBlock();
  const migrate = deploy.indexOf('php artisan migrate --force');
  const refresh = deploy.indexOf('refresh_laravel_bootstrap_caches');
  const reload = deploy.indexOf('nginx_reload_upstreams');
  const verify = deploy.indexOf('run_verify_quick');
  assert.ok(migrate >= 0 && migrate < refresh && refresh < reload && reload < verify, 'cache refresh and nginx reload must follow migrations and precede verification');
});

test('quick verification includes the real category filter smoke', () => {
  assert.equal(packageJson.scripts['smoke:category-filters'], 'bash scripts/category-filter-smoke.sh');
  assert.match(packageJson.scripts['smoke:all'], /npm run smoke:prod && npm run smoke:category-filters && npm run smoke:auth-providers/);

  const fallbackStart = operator.indexOf('npm not found; running server-compatible verify:quick fallback');
  const fallbackEnd = operator.indexOf('\n}\n\ncase "$OPERATION"', fallbackStart);
  const fallback = operator.slice(fallbackStart, fallbackEnd);
  assert.match(fallback, /bash scripts\/category-filter-smoke\.sh/);
});

import { chmodSync, mkdirSync, mkdtempSync, readFileSync as read, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('mocked deploy enforces cache and upstream refresh order', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'mercasto-deploy-cache-'));
  const bin = join(fixture, 'bin');
  const cache = join(fixture, 'backend', 'bootstrap', 'cache');
  const trace = join(fixture, 'trace.log');
  mkdirSync(join(fixture, '.git'));
  mkdirSync(bin);
  mkdirSync(cache, { recursive: true });
  mkdirSync(join(fixture, 'scripts'), { recursive: true });
  writeFileSync(join(fixture, 'scripts', 'offsite-backup-smoke.sh'), '#!/usr/bin/env bash\nexit 0\n');
  chmodSync(join(fixture, 'scripts', 'offsite-backup-smoke.sh'), 0o755);
  writeFileSync(join(fixture, 'scripts', 'production-schema-drift-smoke.sh'), '#!/usr/bin/env bash\nexit 0\n');
  chmodSync(join(fixture, 'scripts', 'production-schema-drift-smoke.sh'), 0o755);
  writeFileSync(join(fixture, 'scripts', 'postgres-observability-activation-smoke.sh'), '#!/usr/bin/env bash\nexit 0\n');
  chmodSync(join(fixture, 'scripts', 'postgres-observability-activation-smoke.sh'), 0o755);
  writeFileSync(join(fixture, 'scripts', 'production-e2e-account-security-smoke.sh'), '#!/usr/bin/env bash\nexit 0\n');
  chmodSync(join(fixture, 'scripts', 'production-e2e-account-security-smoke.sh'), 0o755);
  writeFileSync(join(fixture, 'docker-compose.yml'), 'services: {}\n');
  writeFileSync(join(fixture, 'backend', '.env'), 'APP_ENV=testing\n');
  writeFileSync(join(cache, 'config.php'), 'stale');
  writeFileSync(join(cache, 'events.php'), 'stale');
  writeFileSync(join(cache, 'routes-v7.php'), 'stale');
  const fakeGit = `#!/usr/bin/env bash
printf 'git %s\n' "$*" >> "$TRACE_FILE"
`;
  const fakeNpm = `#!/usr/bin/env bash
printf 'npm %s\n' "$*" >> "$TRACE_FILE"
`;
  const fakeDocker = `#!/usr/bin/env bash
set -euo pipefail
if [[ "$*" == *'up -d --build --remove-orphans'* ]]; then
  test ! -e "$PROJECT_DIR/backend/bootstrap/cache/config.php"
  printf 'up-cache-cleared\n' >> "$TRACE_FILE"
fi
printf 'docker %s\n' "$*" >> "$TRACE_FILE"
if [[ "$*" == *'php artisan optimize'* ]]; then
  printf 'fresh' > "$PROJECT_DIR/backend/bootstrap/cache/config.php"
fi
`;

  for (const [name, content] of [['git', fakeGit], ['npm', fakeNpm], ['docker', fakeDocker]]) {
    const path = join(bin, name);
    writeFileSync(path, content);
    chmodSync(path, 0o755);
  }

  try {
    const result = spawnSync('bash', ['scripts/server-operator.sh', 'deploy_main', 'MERCASTO'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        OPERATION: 'deploy_main',
        CONFIRM: 'MERCASTO',
        PROJECT_DIR: fixture,
        TRACE_FILE: trace,
        COMPOSE_ENV_FILE: 'backend/.env',
      },
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);

    const traceText = read(trace, 'utf8').trim();
    const lines = traceText.split('\n');
    const index = (fragment) => lines.findIndex((line) => line.includes(fragment));
    const reset = index('git reset --hard origin/main');
    const cleared = index('up-cache-cleared');
    const start = index('up -d --build --remove-orphans');
    const migrate = index('php artisan migrate --force');
    const optimize = index('php artisan optimize');
    const reload = index('nginx -s reload');
    const verify = index('npm run verify:quick');
    const diagnostics = `trace:\n${traceText}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`;

    assert.ok(reset >= 0, `deploy must invoke git reset\n${diagnostics}`);
    assert.ok(cleared >= 0, `docker up must observe cleared bootstrap caches\n${diagnostics}`);
    assert.equal(lines.filter((line) => line === 'up-cache-cleared').length, 1, diagnostics);
    assert.ok(start >= 0 && start < migrate && migrate < optimize && optimize < reload && reload < verify, diagnostics);
    assert.equal(read(join(cache, 'config.php'), 'utf8'), 'fresh');
    assert.throws(() => read(join(cache, 'events.php'), 'utf8'));
    assert.throws(() => read(join(cache, 'routes-v7.php'), 'utf8'));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
