import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const hook = fs.readFileSync('src/app/useAuthSessionState.js', 'utf8');

test('App delegates auth session state while keeping auth effects in orchestration', () => {
  assert.match(app, /useAuthSessionState\(initialAuthToken, initialUser\)/);
  for (const name of ['authReady', 'user', 'showAuthModal', 'authMode', 'authLoading', 'requiresTwoFactor']) {
    assert.doesNotMatch(app, new RegExp(`const \\[${name}, set`));
  }
  assert.match(app, /fetch\('\/api\/user\/preferences'/);
  assert.match(app, /authModalDialogRef = useRef\(null\)/);
});

test('auth session hook preserves initialization contracts', () => {
  assert.match(hook, /useState\(!initialAuthToken\)/);
  assert.match(hook, /useState\(initialUser\)/);
  assert.match(hook, /useState\('login'\)/);
  assert.equal((hook.match(/useState\(false\)/g) || []).length >= 6, true);
  assert.equal((hook.match(/useState\(null\)/g) || []).length >= 1, true);
});
