import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const hardeningScript = fs.readFileSync('scripts/stabilize-playwright-apt.sh', 'utf8');
const workflowFiles = fs.readdirSync('.github/workflows')
  .filter(name => /\.ya?ml$/.test(name))
  .map(name => path.join('.github/workflows', name));

test('shared Playwright apt hardening isolates unstable runner sources', () => {
  assert.ok(hardeningScript.includes('dl.google.com/linux/chrome'));
  assert.ok(hardeningScript.includes('archive.ubuntu.com/ubuntu'));
  assert.ok(hardeningScript.includes('Acquire::Retries "3";'));
  assert.ok(hardeningScript.includes('Acquire::https::Timeout "20";'));
});

test('every with-deps workflow hardens apt sources before browser installation', () => {
  let installCount = 0;
  for (const file of workflowFiles) {
    const workflow = fs.readFileSync(file, 'utf8');
    const installs = [...workflow.matchAll(/npx playwright install --with-deps/g)].map(match => match.index);
    installCount += installs.length;
    for (const installIndex of installs) {
      const prefix = workflow.slice(0, installIndex);
      assert.ok(
        prefix.lastIndexOf('bash scripts/stabilize-playwright-apt.sh') >= 0,
        `${file}: missing hardening before Playwright install`,
      );
    }
  }
  assert.ok(installCount >= 3, 'expected current Playwright with-deps workflows to be covered');
});
