import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const app = readFileSync('src/App.jsx', 'utf8');
const componentFiles = globSync('src/components/**/*.jsx');

test('App owns the single top-level main landmark', () => {
  assert.equal((app.match(/<main\b/g) || []).length, 1);
  assert.equal((app.match(/<\/main>/g) || []).length, 1);
});

test('route and nested components do not introduce nested main landmarks', () => {
  const offenders = componentFiles.filter(file => {
    const source = readFileSync(file, 'utf8');
    return /<main\b|<\/main>/.test(source);
  });
  assert.deepEqual(offenders, []);
});
