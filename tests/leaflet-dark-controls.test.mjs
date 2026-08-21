import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const css = fs.readFileSync('src/index.css', 'utf8');

test('Leaflet zoom and attribution controls follow the dark theme', () => {
  for (const selector of [
    'html.dark .leaflet-control-zoom a {',
    'html.dark .leaflet-control-zoom a:hover {',
    'html.dark .leaflet-control-attribution {',
    'html.dark .leaflet-control-attribution a {',
  ]) assert.ok(css.includes(selector), selector);
  assert.match(css, /background-color: #1E293B/);
  assert.match(css, /background: rgba\(15, 23, 42, 0\.88\)/);
});
