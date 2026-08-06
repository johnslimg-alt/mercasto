import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasPullRequestTrigger,
  pullRequestTriggerKinds,
  unsafeSelfHostedPullRequestJobs,
  workflowJobs,
} from './self-hosted-pr-safety.mjs';

const unsafePullRequestWorkflow = `name: Unsafe PR
on:
  pull_request:

jobs:
  live:
    runs-on: [self-hosted, linux]
    steps:
      - run: cd /var/www/mercasto && bash scripts/live.sh
`;

const unsafeTargetCheckoutWorkflow = `name: Unsafe target
on: pull_request_target

jobs:
  live:
    runs-on:
      - self-hosted
      - linux
    steps:
      - uses: actions/checkout@v6
`;

const safeTargetWorkflow = `name: Safe target
on:
  pull_request_target:

jobs:
  live:
    runs-on: [self-hosted, linux]
    steps:
      - run: cd /var/www/mercasto && bash scripts/live.sh
`;

const trustedWorkflow = `name: Trusted
on:
  schedule:
    - cron: '0 * * * *'

jobs:
  watch:
    runs-on: [self-hosted, linux]
    steps:
      - uses: actions/checkout@v6
`;

test('detects pull request trigger kinds and job blocks', () => {
  assert.equal(hasPullRequestTrigger(unsafePullRequestWorkflow), true);
  assert.deepEqual([...pullRequestTriggerKinds(unsafePullRequestWorkflow)], ['pull_request']);
  assert.deepEqual(workflowJobs(unsafePullRequestWorkflow).map((job) => job.name), ['live']);
});

test('rejects every self-hosted pull_request job even without checkout', () => {
  assert.deepEqual(
    unsafeSelfHostedPullRequestJobs(unsafePullRequestWorkflow).map((job) => job.name),
    ['live'],
  );
});

test('rejects checkout in a self-hosted pull_request_target job', () => {
  assert.deepEqual(
    unsafeSelfHostedPullRequestJobs(unsafeTargetCheckoutWorkflow).map((job) => job.name),
    ['live'],
  );
});

test('accepts trusted server-resident scripts in pull_request_target', () => {
  assert.deepEqual(unsafeSelfHostedPullRequestJobs(safeTargetWorkflow), []);
});

test('allows checkout in trusted schedule-only workflows', () => {
  assert.equal(hasPullRequestTrigger(trustedWorkflow), false);
  assert.deepEqual(unsafeSelfHostedPullRequestJobs(trustedWorkflow), []);
});
