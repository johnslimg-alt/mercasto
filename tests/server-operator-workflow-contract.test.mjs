import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflowPath = '.github/workflows/chatgpt-server-operator.yml';
const workflow = fs.readFileSync(workflowPath, 'utf8');

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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('server operator only schedules exact allowlisted commands', () => {
  assert.doesNotMatch(workflow, /startsWith\(github\.event\.comment\.body,\s*['"]RUN:/);

  const gateMatch = workflow.match(/fromJSON\('([^']+)'\)/);
  assert.ok(gateMatch, 'job-level exact command gate must use a JSON allowlist');
  const gatedCommands = JSON.parse(gateMatch[1]);
  assert.deepEqual(gatedCommands, expectedCommands);

  const commandMapMatch = workflow.match(/const commands = \{([\s\S]*?)\n\s*\};/);
  assert.ok(commandMapMatch, 'runtime command map must exist');
  const mappedCommands = [...commandMapMatch[1].matchAll(/'([^']+)'\s*:/g)].map((match) => match[1]);
  assert.deepEqual(mappedCommands, expectedCommands);
});

test('hosted and unknown commands cannot acquire self-hosted operator concurrency', () => {
  assert.doesNotMatch(workflow, /^concurrency:/m, 'workflow-level concurrency would affect skipped issue comments');
  assert.match(
    workflow,
    /^\s{4}concurrency:\n\s{6}group: chatgpt-server-operator\n\s{6}cancel-in-progress: true$/m,
    'operator concurrency must stay scoped to the allowlisted self-hosted job',
  );

  for (const rejected of [
    'RUN:hosted_runner_status',
    'RUN:hosted_agent_recovery:MERCASTO',
    'RUN:not-a-real-command',
  ]) {
    assert.doesNotMatch(
      workflow.match(/fromJSON\('([^']+)'\)/)?.[1] ?? '',
      new RegExp(escapeRegex(rejected)),
      `${rejected} must not be in the self-hosted operator gate`,
    );
  }
});

test('owner and production confirmation boundaries remain present', () => {
  assert.match(workflow, /github\.event\.issue\.number == 832/);
  assert.match(workflow, /github\.actor == 'johnslimg-alt'/);

  for (const command of expectedCommands.filter((value) => value.includes(':MERCASTO'))) {
    assert.match(workflow, new RegExp(escapeRegex(`'${command}':`)));
    assert.match(workflow, new RegExp(escapeRegex("'MERCASTO'")));
  }
});
