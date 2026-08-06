import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/production-checks.yml', 'utf8');

function jobBlocks(source) {
  const jobsIndex = source.indexOf('\njobs:\n');
  assert.ok(jobsIndex >= 0, 'jobs section must exist');
  const lines = source.slice(jobsIndex + 1).split('\n');
  const blocks = new Map();
  let name = null;
  let body = [];

  for (const line of lines) {
    const match = line.match(/^  ([a-zA-Z0-9_-]+):$/);
    if (match) {
      if (name) blocks.set(name, body.join('\n'));
      name = match[1];
      body = [line];
    } else if (name) {
      body.push(line);
    }
  }
  if (name) blocks.set(name, body.join('\n'));
  return blocks;
}

const expectedTimeouts = new Map([
  ['repository-gates', 15],
  ['compose-config', 10],
  ['frontend-build', 15],
  ['frontend-docker-build', 20],
  ['backend-docker-build', 20],
]);

test('every GitHub-hosted production check has an explicit timeout', () => {
  const blocks = jobBlocks(workflow);
  const hostedJobs = [...blocks.entries()].filter(([, block]) => (
    /runs-on: ubuntu-latest/.test(block)
  ));

  assert.equal(hostedJobs.length, expectedTimeouts.size);
  for (const [name, block] of hostedJobs) {
    assert.ok(expectedTimeouts.has(name), `unexpected hosted job: ${name}`);
    assert.match(
      block,
      new RegExp(`timeout-minutes: ${expectedTimeouts.get(name)}(?:\\n|$)`),
      `${name} must retain its bounded timeout`,
    );
  }
});
