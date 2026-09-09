import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync('.github/workflows/frontend-quality.yml', 'utf8');

test('browser and WebKit jobs isolate Playwright from the runner Google Chrome apt source', () => {
  const hardening = workflow.match(/name: Stabilize Playwright apt sources/g) || [];
  assert.equal(hardening.length, 2);
  assert.ok(workflow.includes("grep -q 'dl.google.com/linux/chrome'"));
  assert.ok(workflow.includes('Acquire::Retries "3";'));

  const chromiumHardening = workflow.indexOf('name: Stabilize Playwright apt sources');
  const chromiumInstall = workflow.indexOf('name: Install Chromium');
  const webkitHardening = workflow.lastIndexOf('name: Stabilize Playwright apt sources');
  const webkitInstall = workflow.indexOf('name: Install WebKit');
  assert.ok(chromiumHardening >= 0 && chromiumHardening < chromiumInstall);
  assert.ok(webkitHardening > chromiumHardening && webkitHardening < webkitInstall);
});
