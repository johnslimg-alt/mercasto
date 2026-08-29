import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const hook = fs.readFileSync('src/app/useTransientModalState.js', 'utf8');

const booleanStates = [
  'showProfileModal', 'showCouponModal', 'showReportModal',
  'showUserReportModal', 'showAiModal',
];
const nullableStates = ['reportingAd', 'qrModalData'];

test('App delegates transient modal state to a focused hook', () => {
  assert.match(app, /useTransientModalState\(\)/);
  for (const name of [...booleanStates, ...nullableStates]) {
    assert.doesNotMatch(app, new RegExp(`const \\[${name}, set`));
  }
});

test('transient modal state preserves closed and empty defaults', () => {
  assert.equal((hook.match(/useState\(false\)/g) || []).length, booleanStates.length);
  assert.equal((hook.match(/useState\(null\)/g) || []).length, nullableStates.length);
  for (const name of [...booleanStates, ...nullableStates]) assert.ok(hook.includes(name), name);
});
