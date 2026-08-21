import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const main = fs.readFileSync('src/main.jsx', 'utf8');
const overrides = fs.readFileSync('src/leaflet-dark-overrides.css', 'utf8');
const map = fs.readFileSync('src/components/common/MapV3.jsx', 'utf8');

const executableCss = overrides
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');

test('Leaflet dark chrome overrides stay outside cascade layers', () => {
  const indexImport = main.indexOf("import './index.css'");
  const overrideImport = main.indexOf("import './leaflet-dark-overrides.css'");
  assert.ok(indexImport >= 0, 'index.css import');
  assert.ok(overrideImport > indexImport, 'unlayered Leaflet override import follows index.css');
  assert.match(map, /import\('leaflet\/dist\/leaflet\.css'\)/);
  assert.doesNotMatch(executableCss, /@layer\b/);

  for (const selector of [
    'html.dark .leaflet-control-zoom a {',
    'html.dark .leaflet-control-zoom a:hover {',
    'html.dark .leaflet-control-attribution {',
    'html.dark .leaflet-control-attribution a {',
  ]) assert.ok(executableCss.includes(selector), selector);

  assert.match(executableCss, /background-color: #1E293B/);
  assert.match(executableCss, /background: rgba\(15, 23, 42, 0\.88\)/);
});
