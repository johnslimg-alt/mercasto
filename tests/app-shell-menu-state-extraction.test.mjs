import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const hook = fs.readFileSync('src/app/useShellMenuState.js', 'utf8');

test('App delegates shell menu visibility state to a focused hook', () => {
  assert.match(app, /useShellMenuState\(\)/);
  for (const name of ['showNotifications', 'showProfileMenu', 'showTabBarMenu']) {
    assert.doesNotMatch(app, new RegExp(`const \\[${name}, set`));
  }
});

test('shell menu state defaults remain closed', () => {
  assert.equal((hook.match(/useState\(false\)/g) || []).length, 3);
  for (const name of ['showNotifications', 'showProfileMenu', 'showTabBarMenu']) {
    assert.ok(hook.includes(name), name);
  }
});
