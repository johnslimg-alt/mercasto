import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/automerge.yml', 'utf8');

function jobBlock() {
  const start = workflow.indexOf('\n  automerge:\n');
  assert.ok(start >= 0, 'automerge job must exist');
  return workflow.slice(start);
}

test('newer automerge runs cancel stale work for the same PR or branch', () => {
  assert.match(
    workflow,
    /group: automerge-\$\{\{ github\.event\.pull_request\.number \|\| github\.event\.workflow_run\.head_branch \|\| github\.run_id \}\}/,
  );
  assert.match(workflow, /concurrency:\n[\s\S]*?cancel-in-progress: true/);
  assert.doesNotMatch(workflow, /cancel-in-progress: false/);
});

test('automerge is bounded and stays on a hosted runner', () => {
  const job = jobBlock();
  assert.match(job, /runs-on: ubuntu-latest/);
  assert.match(job, /timeout-minutes: 10/);
  assert.doesNotMatch(job, /self-hosted/);
});
