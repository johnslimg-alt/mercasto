import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/utils/protectedRouteReturn.js', 'utf8');

test('protected intent survives the registration auth-to-onboarding gap', () => {
  const authCheck = source.indexOf('if (!hasAuthenticatedSession)');
  const settleCheck = source.indexOf('if (Date.now() - authenticatedAt < AUTH_SETTLE_MS) return;', authCheck);
  const sameRouteFinish = source.indexOf('if (current?.path === intent.path)', authCheck);

  assert.ok(authCheck >= 0, 'authenticated session guard exists');
  assert.ok(settleCheck > authCheck, 'auth settle window follows session detection');
  assert.ok(sameRouteFinish > settleCheck, 'same-route intent is not cleared before auth settles');
  assert.match(source, /key === REGISTRATION_FLAG_KEY && readIntent\(\)/);
});
