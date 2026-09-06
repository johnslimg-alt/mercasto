import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const deploy = readFileSync('.github/workflows/deploy-selfhosted.yml', 'utf8');
const dockerfile = readFileSync('backend/Dockerfile', 'utf8');
const bootstrap = readFileSync('backend/bootstrap/app.php', 'utf8');
const refresh = readFileSync('backend/docker/refresh-runtime-env.sh', 'utf8');

test('persistent host env is not widened to the shared www-data group', () => {
  assert.doesNotMatch(deploy, /chown root:www-data \/var\/www\/\.env/);
  assert.doesNotMatch(deploy, /chmod 0?640 \/var\/www\/\.env/);
  assert.match(deploy, /sudo -n chown root:root backend\/\.env/);
  assert.match(deploy, /sudo -n chmod 0600 backend\/\.env/);
  assert.match(deploy, /if test -r backend\/\.env; then/);
});

test('compose env remains distinct from the Laravel runtime env boundary', () => {
  assert.ok((deploy.match(/COMPOSE_ENV_FILE="\/var\/www\/mercasto\/\.env"/g) ?? []).length >= 5);
  assert.doesNotMatch(deploy, /COMPOSE_ENV_FILE="\$RUNNER_TEMP\/mercasto-backend\.env"/);
  assert.match(deploy, /docker exec mercasto_backend_container cat \/var\/www\/\.env > "\$RUNNER_TEMP\/mercasto-backend\.env"/);
  assert.match(deploy, /rm -f "\$RUNNER_TEMP\/mercasto-backend\.env"/);
});

test('PHP runtimes receive a container-only readable env copy', () => {
  assert.match(deploy, /\/var\/www\/docker\/refresh-runtime-env\.sh/);
  assert.match(deploy, /docker exec -u www-data mercasto_backend_container test -r \/run\/mercasto\/\.env/);
  assert.match(refresh, /RUNTIME_DIR="\$\{MERCASTO_RUNTIME_ENV_DIR:-\/run\/mercasto\}"/);
  assert.match(refresh, /chown root:www-data "\$tmp_env"/);
  assert.match(refresh, /chmod 0640 "\$tmp_env"/);
});

test('Laravel and the PHP image use the runtime env boundary at container start', () => {
  assert.match(dockerfile, /ENTRYPOINT \["\/usr\/local\/bin\/mercasto-runtime-entrypoint"\]/);
  assert.match(dockerfile, /install -m 0755 docker\/refresh-runtime-env\.sh \/usr\/local\/bin\/mercasto-refresh-runtime-env/);
  assert.match(bootstrap, /\$runtimeEnvironmentPath = '\/run\/mercasto';/);
  assert.match(bootstrap, /\$application->useEnvironmentPath\(\$runtimeEnvironmentPath\);/);
});
