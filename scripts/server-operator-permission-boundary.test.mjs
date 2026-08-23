import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('scripts/server-operator.sh', 'utf8');

test('deploy_main uses the established narrow sudo boundary for root-owned production git state', () => {
  const match = source.match(/\n  deploy_main\)\n([\s\S]*?)\n    ;;/);
  assert.ok(match, 'deploy_main block must exist');
  const block = match[1];

  assert.match(block, /sudo -n git fetch origin/);
  assert.match(block, /sudo -n git reset --hard origin\/main/);
  assert.match(block, /sudo -n git clean -fd/);
  assert.doesNotMatch(block, /^\s+git fetch origin/m);
  assert.doesNotMatch(block, /^\s+git reset --hard origin\/main/m);
  assert.doesNotMatch(block, /^\s+git clean -fd/m);
});

test('Laravel bootstrap cache cleanup uses the same narrow privileged file boundary', () => {
  const match = source.match(/clear_laravel_bootstrap_caches\(\) \{([\s\S]*?)\n\}/);
  assert.ok(match, 'cache cleanup helper must exist');
  assert.match(match[1], /sudo -n rm -f backend\/bootstrap\/cache\/\*\.php/);
});

test('operator permission fix does not broaden filesystem ownership or mode', () => {
  assert.doesNotMatch(source, /\bchown\s+-R\b/);
  assert.doesNotMatch(source, /\bchmod\s+-R\b/);
});
