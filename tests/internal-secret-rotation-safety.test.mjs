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

test('internal secret rotation preserves ownership and mode for protected env files', () => {
  assert.match(script, /if \[ -w "\$target" \]; then/);
  assert.match(script, /owner="\$\(stat -c '%U' "\$target"\)"/);
  assert.match(script, /group="\$\(stat -c '%G' "\$target"\)"/);
  assert.match(script, /mode="\$\(stat -c '%a' "\$target"\)"/);
  assert.match(script, /sudo -n install -o "\$owner" -g "\$group" -m "\$mode" "\$tmp" "\$stage"/);
  assert.match(script, /sudo -n mv -f "\$stage" "\$target"/);
  assert.doesNotMatch(script, /chmod\s+666/);
  assert.doesNotMatch(script, /chown\s+-R/);
  assert.doesNotMatch(script, /p\.write_text\(/);
});
