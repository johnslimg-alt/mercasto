import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read = file => fs.readFileSync(file, 'utf8');
const hardeningScript = read('scripts/stabilize-playwright-apt.sh');
const workflowFiles = fs.readdirSync('.github/workflows')
  .filter(name => /\.ya?ml$/.test(name))
  .map(name => path.join('.github/workflows', name));

function jobBlocks(workflow) {
  const jobsAt = workflow.indexOf('\njobs:\n');
  if (jobsAt < 0) return [];
  const jobs = workflow.slice(jobsAt + 6);
  const starts = [...jobs.matchAll(/^  [A-Za-z0-9_-]+:\n/gm)].map(match => match.index);
  return starts.map((start, index) => jobs.slice(start, starts[index + 1] ?? jobs.length));
}

test('shared Playwright apt hardening isolates unstable runner sources', () => {
  assert.ok(hardeningScript.includes('dl.google.com/linux/chrome'));
  assert.ok(hardeningScript.includes('archive.ubuntu.com/ubuntu'));
  assert.ok(hardeningScript.includes('Acquire::Retries "3";'));
  assert.ok(hardeningScript.includes('Acquire::https::Timeout "20";'));
});
test('every with-deps install is hardened inside the same workflow job', () => {
  let installCount = 0;
  for (const file of workflowFiles) {
    for (const job of jobBlocks(read(file))) {
      const installs = [...job.matchAll(/npx playwright install --with-deps/g)].map(match => match.index);
      installCount += installs.length;
      for (const installAt of installs) {
        const hardeningAt = job.lastIndexOf('bash scripts/stabilize-playwright-apt.sh', installAt);
        assert.ok(hardeningAt >= 0, `${file}: Playwright install lacks same-job apt hardening`);
      }
    }
  }
  assert.ok(installCount >= 3, 'expected current Playwright with-deps workflows to be covered');
});

test('hardening script changes trigger every dependent push workflow', () => {
  const frontend = read('.github/workflows/frontend-quality.yml');
  const frontendPush = frontend.slice(frontend.indexOf('  push:'), frontend.indexOf('  pull_request:'));
  assert.ok(frontendPush.includes("'scripts/stabilize-playwright-apt.sh'"));
  assert.ok(frontend.includes('stabilize-playwright-apt\\.sh|public-ui-route-policy'));

  const legal = read('.github/workflows/legal-readiness.yml');
  const legalPush = legal.slice(legal.indexOf('  push:'), legal.indexOf('\njobs:'));
  assert.ok(legalPush.includes("'scripts/stabilize-playwright-apt.sh'"));
});
