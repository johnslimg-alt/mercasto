import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const main = fs.readFileSync('src/main.jsx', 'utf8');
const css = fs.readFileSync('src/admin-dark-safety.css', 'utf8');

test('admin semantic dark safety stylesheet is loaded after the global stylesheet', () => {
  const globalIndex = main.indexOf("import './index.css'");
  const adminIndex = main.indexOf("import './admin-dark-safety.css'");
  assert.ok(globalIndex >= 0, 'global stylesheet import missing');
  assert.ok(adminIndex > globalIndex, 'admin safety layer must load after index.css');
});

test('admin dark safety covers legacy semantic light surfaces without global leakage', () => {
  assert.ok(css.includes('html.dark .dashboard-dark-scope'), 'scope must stay admin-only');
  for (const token of [
    '.bg-emerald-50', '.bg-emerald-100',
    '.bg-red-50', '.bg-red-100',
    '.bg-amber-50', '.bg-amber-100',
    '.bg-blue-50', '.bg-blue-100',
    '.bg-lime-50', '.bg-lime-100',
    '.border-emerald-100', '.border-red-100', '.border-amber-100', '.border-blue-100', '.border-lime-100',
  ]) assert.ok(css.includes(token), token);

  assert.equal(css.includes('html.dark :is(.bg-'), false, 'semantic overrides must not leak outside the admin scope');
});
