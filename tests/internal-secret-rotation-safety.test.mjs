import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const script = fs.readFileSync('scripts/rotate-internal-secrets.sh', 'utf8');

test('internal secret rotation deletes legacy env backups only inside the Mercasto checkout', () => {
  assert.match(script, /REPO_ROOT="\$\(git rev-parse --show-toplevel\)"/);
  assert.match(script, /find "\$REPO_ROOT" -xdev -type f/);
  assert.doesNotMatch(script, /find\s+\/root(?:\s|$)/);
  assert.doesNotMatch(script, /find\s+\/var\/www(?:\s|$)/);
});

test('internal secret rotation identifies failed post-checks and retries transient readiness', () => {
  assert.match(script, /failed at step=\$\{STEP:-unknown\}/);
  assert.match(script, /retry_cmd\(\)/);
  assert.match(script, /trap rollback ERR\n\nSTEP=database-role-update\nprintf 'ALTER ROLE/);
  assert.match(script, /STEP=backend-db/);
  assert.match(script, /retry_cmd 12 5 check_backend_db/);
  assert.match(script, /STEP=frontend-reload/);
  assert.match(script, /retry_cmd 10 2 reload_frontend_upstream/);
  assert.match(script, /STEP=public-categories/);
  assert.match(script, /retry_cmd 12 5 check_public_url https:\/\/mercasto\.com\/api\/categories/);
  assert.match(script, /STEP=public-home/);
  assert.doesNotMatch(script, /eval/);
});
