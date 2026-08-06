import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const workflowDir = '.github/workflows';
const workflowFiles = readdirSync(workflowDir)
  .filter((name) => /\.ya?ml$/.test(name))
  .map((name) => `${workflowDir}/${name}`);

const expected = new Map([
  ['public-smoke.yml', 'public-smoke-check'],
  ['production-checks.yml', 'production-checks'],
  ['production-live-gates.yml', 'production-live-gates'],
  ['backend-image-gate.yml', 'backend-image-gate'],
  ['frontend-quality.yml', 'frontend-quality'],
  ['backend-tests.yml', 'backend-phpunit'],
  ['vps-live-gate.yml', 'vps-live-gate'],
  ['e2e-seller.yml', 'e2e-seller'],
  ['manual-verification-suite.yml', 'manual-verification-suite'],
  ['backend-schema-inventory.yml', 'backend-schema-inventory'],
]);

function concurrencyBlock(source) {
  const match = source.match(/\nconcurrency:\n((?: {2}[^\n]*\n?)+)/);
  return match?.[1] ?? '';
}

test('verification workflows isolate PRs and non-PR commits', () => {
  for (const [file, prefix] of expected) {
    const source = readFileSync(`${workflowDir}/${file}`, 'utf8');
    const block = concurrencyBlock(source);
    assert.ok(block, `${file} must retain a concurrency block`);
    assert.match(
      block,
      new RegExp(`group: ${prefix}-\\$\\{\\{ github\\.event\\.pull_request\\.number \\|\\| github\\.sha \\}\\}`),
      `${file} must group PR runs by PR number and non-PR runs by commit SHA`,
    );
    assert.match(block, /cancel-in-progress: true/);
    assert.doesNotMatch(block, /github\.ref/);
  }
});

test('no cancel-in-progress workflow groups by github.ref', () => {
  for (const path of workflowFiles) {
    const source = readFileSync(path, 'utf8');
    const block = concurrencyBlock(source);
    if (/cancel-in-progress: true/.test(block)) {
      assert.doesNotMatch(block, /github\.ref/, path);
    }
  }
});


test('production SEO live gate matches the localized title availability contract', () => {
  const workflow = readFileSync(`${workflowDir}/production-live-gates.yml`, 'utf8');
  const watch = readFileSync('scripts/public-production-watch.sh', 'utf8');
  const contract = '<title[^>]*>[^<]{10,160}</title>';
  assert.ok(workflow.includes(contract));
  assert.ok(watch.includes(contract));
  assert.doesNotMatch(workflow, /\{10,70\}/);
  assert.doesNotMatch(watch, /\{10,70\}/);
});
