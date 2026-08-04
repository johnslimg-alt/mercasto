import assert from 'node:assert/strict';
import test from 'node:test';
import { isSafePaymentUrl } from '../src/utils/paidAdRenewalBridge.js';

test('accepts HTTPS provider checkout URLs', () => {
  assert.equal(isSafePaymentUrl('https://pay.clip.mx/checkout/abc', 'https://mercasto.com'), true);
});

test('accepts HTTP only for local test hosts', () => {
  assert.equal(isSafePaymentUrl('http://127.0.0.1:4173/mock-checkout', 'http://127.0.0.1:4173'), true);
  assert.equal(isSafePaymentUrl('http://localhost:4173/mock-checkout', 'http://localhost:4173'), true);
  assert.equal(isSafePaymentUrl('http://pay.example.test/checkout', 'https://mercasto.com'), false);
});

test('rejects unsafe schemes and malformed URLs', () => {
  assert.equal(isSafePaymentUrl('javascript:alert(1)', 'https://mercasto.com'), false);
  assert.equal(isSafePaymentUrl('data:text/html,hello', 'https://mercasto.com'), false);
  assert.equal(isSafePaymentUrl('not a url', undefined), false);
});
