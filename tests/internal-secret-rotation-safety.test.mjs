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
