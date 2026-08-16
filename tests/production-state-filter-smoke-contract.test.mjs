import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts/production-state-filter-smoke.sh'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/post-merge-production-verify.yml'), 'utf8');

test('post-deploy verification permanently runs the state-filter fallback smoke', () => {
  assert.match(workflow, /name: Verify production state-filter fallback/);
  assert.match(workflow, /bash scripts\/production-state-filter-smoke\.sh/);
});

test('state-filter smoke proves fallback contribution and exact public API total', () => {
  assert.match(script, /fallback_only/);
  assert.match(script, /expected/);
  assert.match(script, /api_total/);
  assert.match(script, /if \[ "\$fallback_only" -le 0 \]/);
  assert.match(script, /if \[ "\$api_total" -ne "\$expected" \]/);
  assert.match(script, /--data-urlencode "state=\$state"/);
});

test('state-filter smoke remains read-only', () => {
  assert.doesNotMatch(script, /->(?:update|delete|forceDelete|save)\s*\(/);
  assert.doesNotMatch(script, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|DROP)\b/i);
  assert.doesNotMatch(script, /php artisan (?:migrate|db:seed)/);
});
