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
  const wiringText = [
    readTree(WORKFLOW_DIR),
    readTree(SCRIPTS_DIR),
    fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'),
  ].join('\n');

  assert.equal((frontendWorkflow.match(/- 'tests\/\*\*'/g) || []).length, 2, 'Frontend Quality must trigger on tests/** for push and pull_request');
  assert.equal((frontendWorkflow.match(/- 'playwright\.config\.\*'/g) || []).length, 2, 'Frontend Quality must trigger on Playwright config changes');

  const timeoutMinutes = Number(frontendWorkflow.match(/timeout-minutes:\s*(\d+)/)?.[1] || 0);
  assert.ok(timeoutMinutes >= 30, `Frontend Quality timeout is too low for the full browser matrix: ${timeoutMinutes}`);

  const orphaned = e2eSpecs.filter((name) => !wiringText.includes(name));
  assert.deepEqual(orphaned, [], `Unwired E2E specs: ${orphaned.join(', ')}`);
  assert.ok(e2eSpecs.length >= 66, `Unexpected E2E inventory shrink: ${e2eSpecs.length}`);
});
