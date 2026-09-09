import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const hardeningScript = fs.readFileSync('scripts/stabilize-playwright-apt.sh', 'utf8');
const workflows = [
  '.github/workflows/frontend-quality.yml',
  '.github/workflows/public-ui-visual-evidence.yml',
  '.github/workflows/legal-readiness.yml',
];

test('shared Playwright apt hardening isolates unstable runner sources', () => {
  assert.ok(hardeningScript.includes('dl.google.com/linux/chrome'));
  assert.ok(hardeningScript.includes('archive.ubuntu.com/ubuntu'));
  assert.ok(hardeningScript.includes('Acquire::Retries "3";'));
  assert.ok(hardeningScript.includes('Acquire::https::Timeout "20";'));
});

test('every with-deps workflow hardens apt sources before browser installation', () => {
  for (const file of workflows) {
    const workflow = fs.readFileSync(file, 'utf8');
    const installs = [...workflow.matchAll(/npx playwright install --with-deps/g)].map(match => match.index);
    assert.ok(installs.length > 0, file);
    for (const installIndex of installs) {
      const prefix = workflow.slice(0, installIndex);
      const hardeningIndex = prefix.lastIndexOf('bash scripts/stabilize-playwright-apt.sh');
      assert.ok(hardeningIndex >= 0, `${file}: missing hardening before Playwright install`);
    }
  }
});
