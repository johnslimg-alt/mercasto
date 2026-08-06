import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import {
  normalizedAttemptCount,
  requestSeoAuditText,
  resolveSeoAuditRequest,
} from './seo-audit-request.mjs';

test('uses the public production URL directly by default', () => {
  const request = resolveSeoAuditRequest('/listings?sort=new', {
    baseUrl: 'https://mercasto.com',
  });

  assert.equal(request.publicUrl, 'https://mercasto.com/listings?sort=new');
  assert.equal(request.fetchUrl, request.publicUrl);
  assert.deepEqual(request.headers, {});
});

test('uses a Host header only for an explicit connect-origin override', () => {
  const request = resolveSeoAuditRequest('/robots.txt', {
    baseUrl: 'https://mercasto.com',
    connectBaseUrl: 'https://127.0.0.1',
  });

  assert.equal(request.publicUrl, 'https://mercasto.com/robots.txt');
  assert.equal(request.fetchUrl, 'https://127.0.0.1/robots.txt');
  assert.deepEqual(request.headers, { Host: 'mercasto.com' });
});


test('explicit connect override sends the public Host header', async () => {
  let receivedHost = '';
  const server = createServer((request, response) => {
    receivedHost = request.headers.host || '';
    response.statusCode = 200;
    response.end('ok');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();

  try {
    const response = await requestSeoAuditText('/robots.txt', {
      baseUrl: 'http://mercasto.test',
      connectBaseUrl: `http://127.0.0.1:${address.port}`,
    });
    assert.equal(response.status, 200);
    assert.equal(response.text, 'ok');
    assert.equal(receivedHost, 'mercasto.test');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('rejects unsupported request schemes', () => {
  assert.throws(
    () => resolveSeoAuditRequest('/', { baseUrl: 'file:///tmp/site' }),
    /must use http or https/,
  );
});

test('bounds network attempts', () => {
  assert.equal(normalizedAttemptCount(undefined), 3);
  assert.equal(normalizedAttemptCount('0'), 1);
  assert.equal(normalizedAttemptCount('2'), 2);
  assert.equal(normalizedAttemptCount('20'), 5);
});
