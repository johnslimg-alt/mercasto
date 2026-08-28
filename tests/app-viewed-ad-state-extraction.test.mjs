import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const hook = fs.readFileSync('src/app/useViewedAdState.js', 'utf8');

test('App delegates viewed listing deep-link state to a focused hook', () => {
  assert.match(app, /useViewedAdState\(\)/);
  assert.doesNotMatch(app, /const \[viewedAd, setViewedAd\] = useState/);
  assert.doesNotMatch(app, /const \[deepLinkAdMissing, setDeepLinkAdMissing\] = useState/);
  assert.doesNotMatch(app, /const \[deepLinkAdLoadError, setDeepLinkAdLoadError\] = useState/);
});

test('viewed listing hook preserves safe deep-link defaults', () => {
  assert.match(hook, /useState\(null\)/);
  assert.equal((hook.match(/useState\(false\)/g) || []).length, 2);
  assert.match(hook, /deepLinkAdRetryNonce, setDeepLinkAdRetryNonce/);
  assert.match(hook, /useState\(0\)/);
});
