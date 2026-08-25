import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflowPath = path.join(rootDir, '.github', 'workflows', 'chatgpt-server-operator.yml');
const workflow = readFileSync(workflowPath, 'utf8');

const sortedMatches = (regex) => [...workflow.matchAll(regex)].map((match) => match[1]).sort();

test('self-hosted server operator routing is explicit and job-scoped', () => {
  const jobsIndex = workflow.indexOf('\njobs:\n');
  assert.notEqual(jobsIndex, -1, 'workflow must contain jobs block');

  const workflowHeader = workflow.slice(0, jobsIndex);
  assert.doesNotMatch(
    workflowHeader,
    /^concurrency:/m,
    'workflow-level concurrency can let unrelated issue comments cancel a valid operator run',
  );

  assert.match(
    workflow,
    /\n    concurrency:\n      group: chatgpt-server-operator\n      cancel-in-progress: true\n/,
    'valid operator jobs must keep serialized cancel-in-progress semantics',
  );
  assert.doesNotMatch(
    workflow,
    /startsWith\(github\.event\.comment\.body,\s*['"]RUN:/,
    'generic RUN:* routing would consume the self-hosted runner for hosted or unknown commands',
  );

  const routedCommands = sortedMatches(/github\.event\.comment\.body == '([^']+)'/g);
  const mappedCommands = sortedMatches(/^\s+'(RUN:[^']+)': \[/gm);

  assert.ok(routedCommands.length > 0, 'operator route allowlist must not be empty');
  assert.deepEqual(
    routedCommands,
    mappedCommands,
    'job routing allowlist must exactly match the command validation map',
  );
  assert.equal(new Set(routedCommands).size, routedCommands.length, 'operator route commands must be unique');

  for (const hostedCommand of [
    'RUN:hosted_runner_status',
    'RUN:hosted_agent_recovery:MERCASTO',
    'RUN:mcp_bridge_status',
    'RUN:reef_mcp_agent_install:MERCASTO',
  ]) {
    assert.ok(
      !routedCommands.includes(hostedCommand),
      `${hostedCommand} must stay outside self-hosted operator routing`,
    );
  }

  assert.ok(!routedCommands.includes('RUN:unknown'), 'unknown RUN:* commands must not route to self-hosted operator');
});
