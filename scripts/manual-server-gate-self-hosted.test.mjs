import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const workflowPath = '.github/workflows/live-server-gate.yml';
const workflow = readFileSync(workflowPath, 'utf8');
const operator = readFileSync('scripts/server-operator.sh', 'utf8');

test('manual server gate uses the trusted self-hosted runner', () => {
  assert.match(workflow, /runs-on: \[self-hosted, linux, docker\]/);
  assert.match(workflow, /cd \/var\/www\/mercasto/);
  assert.match(workflow, /bash scripts\/server-operator\.sh "\$\{OPERATION\}"/);
  assert.match(workflow, /test -z "\$\(git status --short\)"/);
});

test('manual server gate is read-only and independent of SSH secrets', () => {
  assert.doesNotMatch(workflow, /actions\/checkout@/);
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./);
  assert.doesNotMatch(workflow, /ssh-keyscan|MERCASTO_SSH_|SSH_KEY/);
  assert.match(workflow, /status\|verify_quick\|security_smoke\|seo_aeo_smoke/);
  assert.match(workflow, /compose_env_file="\$\(mktemp\)"/);
});

test('obsolete SSH gate helpers stay retired', () => {
  assert.equal(existsSync('scripts/live-server-gate.sh'), false);
  assert.equal(existsSync('scripts/configure-live-server-gate-secrets.sh'), false);
});


test('runner health reports the active systemd listener', () => {
  assert.match(operator, /actions\.runner\.\*\.service/);
  assert.match(operator, /systemctl show "\$service"/);
  assert.match(operator, /\[R\]unner\.Listener/);
  assert.match(operator, /Legacy Docker runner containers/);
});
