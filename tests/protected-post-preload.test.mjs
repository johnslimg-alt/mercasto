import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const main = fs.readFileSync('src/main.jsx', 'utf8');

test('protected publication route starts its lazy chunk before registration completes', () => {
  assert.match(main, /window\.location\.pathname === ['"]\/post['"]/);
  assert.match(main, /import\(['"]\.\/components\/screens\/PostScreen['"]\)/);
});
