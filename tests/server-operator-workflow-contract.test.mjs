import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/chatgpt-server-operator.yml', 'utf8');
const expectedCommands = [
  'RUN:status',
  'RUN:verify_quick',
  'RUN:security_smoke',
  'RUN:seo_aeo_smoke',
  'RUN:runner_health',
  'RUN:logs_frontend',
  'RUN:logs_backend',
  'RUN:deploy_main:MERCASTO',
  'RUN:restart_frontend:MERCASTO',
  'RUN:restart_stack:MERCASTO',
  'RUN:align_media_caps:MERCASTO',
  'RUN:cleanup_docker:MERCASTO',
];

function sorted(values) {
  return [...values].sort();
}

test('self-hosted operator scheduling gate exactly matches the runtime command allowlist', () => {
  assert.doesNotMatch(workflow, /startsWith\(github\.event\.comment\.body,\s*['"]RUN:/);

  const gateMatch = workflow.match(/\s+if: >-\n([\s\S]*?)\n\s+runs-on:/);
  assert.ok(gateMatch, 'operator job gate must exist before runs-on');
  const gateCommands = [...gateMatch[1].matchAll(/github\.event\.comment\.body == '([^']+)'/g)]
    .map((match) => match[1]);

  const mapMatch = workflow.match(/const commands = \{([\s\S]*?)\n\s*\};/);
  assert.ok(mapMatch, 'runtime operator command map must exist');
  const runtimeCommands = [...mapMatch[1].matchAll(/'([^']+)'\s*:/g)]
    .map((match) => match[1]);

  assert.deepEqual(sorted(gateCommands), sorted(expectedCommands));
  assert.deepEqual(sorted(runtimeCommands), sorted(expectedCommands));
});

test('hosted and unknown commands cannot schedule the production operator job', () => {
  const gate = workflow.match(/\s+if: >-\n([\s\S]*?)\n\s+runs-on:/)?.[1] ?? '';
  for (const rejected of [
    'RUN:hosted_runner_status',
    'RUN:hosted_agent_recovery:MERCASTO',
    'RUN:mcp_bridge_status',
    'RUN:not-a-real-command',
  ]) {
    assert.equal(gate.includes(`'${rejected}'`), false, `${rejected} must stay outside the self-hosted operator gate`);
  }
});

test('operator concurrency is job-scoped and serializes valid operations', () => {
  assert.doesNotMatch(workflow, /^concurrency:/m, 'workflow-level concurrency would include unrelated issue comments');
  assert.match(
    workflow,
    /^\s{4}concurrency:\n\s{6}group: chatgpt-server-operator\n\s{6}cancel-in-progress: false$/m,
  );
  assert.match(workflow, /github\.event\.issue\.number == 832/);
  assert.match(workflow, /github\.actor == 'johnslimg-alt'/);
});
