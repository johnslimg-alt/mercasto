import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const E2E_DIR = path.join(ROOT, 'tests', 'e2e');
const WORKFLOW_DIR = path.join(ROOT, '.github', 'workflows');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');

function readTree(root) {
  if (!fs.existsSync(root)) return '';
  const chunks = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) chunks.push(fs.readFileSync(full, 'utf8'));
    }
  };
  walk(root);
  return chunks.join('\n');
}

test('every E2E spec is wired into an executable project surface', () => {
  const e2eSpecs = fs.readdirSync(E2E_DIR)
    .filter((name) => name.endsWith('.spec.js'))
    .sort();
  const frontendWorkflow = fs.readFileSync(path.join(WORKFLOW_DIR, 'frontend-quality.yml'), 'utf8');
  const webkitConfig = fs.readFileSync(path.join(ROOT, 'playwright.config.webkit.js'), 'utf8');
  const wiringText = [
    readTree(WORKFLOW_DIR),
    readTree(SCRIPTS_DIR),
    fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'),
  ].join('\n');

  assert.equal((frontendWorkflow.match(/- 'tests\/\*\*'/g) || []).length, 1, 'Frontend Quality push trigger must keep tests/** coverage');
  assert.equal((frontendWorkflow.match(/- 'playwright\.config\.\*'/g) || []).length, 1, 'Frontend Quality push trigger must keep Playwright config coverage');
  assert.match(frontendWorkflow, /pull_request:\s*\n\s*branches:\s*\n\s*- main\s*\n\s*\npermissions:/, 'Frontend Quality pull requests must run without path filtering so the aggregate required check always exists');
  const scopeMatcher = frontendWorkflow.split('\n').find((line) => line.includes('grep -Eq')) || '';
  assert.ok(scopeMatcher.includes('tests/'), 'Frontend Quality scope detector must classify tests/ as frontend-relevant');
  assert.ok(scopeMatcher.includes(String.raw`playwright\.config\.`), 'Frontend Quality scope detector must classify Playwright config as frontend-relevant');
  assert.match(frontendWorkflow, /name: WebKit public smoke/, 'Frontend Quality must keep the dedicated WebKit smoke job');
  assert.match(frontendWorkflow, /npx playwright install --with-deps webkit/, 'Frontend Quality must install WebKit for the dedicated smoke job');
  assert.match(frontendWorkflow, /frontend-quality-shard\.sh webkit-public 4178/, 'Frontend Quality must execute the WebKit public shard');
  assert.match(frontendWorkflow, /WEBKIT_RESULT: \$\{\{ needs\.webkit\.result \}\}/, 'Frontend Quality aggregate must require the WebKit result');
  assert.match(webkitConfig, /name: 'webkit-desktop'/, 'WebKit config must keep desktop Safari coverage');
  assert.match(webkitConfig, /name: 'webkit-mobile'/, 'WebKit config must keep mobile Safari coverage');

  const timeoutMinutes = [...frontendWorkflow.matchAll(/timeout-minutes:\s*(\d+)/g)].map((match) => Number(match[1]));
  assert.ok(Math.max(...timeoutMinutes) >= 30, `Frontend Quality has no timeout large enough for the full browser matrix: ${timeoutMinutes.join(', ')}`);

  const orphaned = e2eSpecs.filter((name) => !wiringText.includes(name));
  assert.deepEqual(orphaned, [], `Unwired E2E specs: ${orphaned.join(', ')}`);
  assert.ok(e2eSpecs.length >= 67, `Unexpected E2E inventory shrink: ${e2eSpecs.length}`);
});
