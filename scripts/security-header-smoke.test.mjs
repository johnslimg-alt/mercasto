import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';

const requiredHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  'Content-Security-Policy': "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
  Server: 'nginx',
};

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address())));
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function runSmoke(baseUrl, httpBaseUrl) {
  return new Promise((resolve) => {
    const child = spawn('bash', ['scripts/security-header-smoke.sh'], {
      cwd: process.cwd(),
      env: { ...process.env, BASE_URL: baseUrl, HTTP_BASE_URL: httpBaseUrl, EXPECTED_HTTPS_ORIGIN: 'https://example.test' },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}
function createSecureServer(headers = requiredHeaders) {
  return createServer((request, response) => {
    for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
    response.setHeader('Set-Cookie', 'ignored=test; Secure; HttpOnly; SameSite=Lax');
    response.statusCode = request.url === '/api/categories' ? 200 : 200;
    response.end(request.url === '/api/categories' ? '[]' : 'ok');
  });
}

function createRedirectServer(serverHeader = 'nginx') {
  return createServer((request, response) => {
    response.setHeader('Location', 'https://example.test/');
    response.setHeader('Server', serverHeader);
    response.statusCode = 301;
    response.end();
  });
}

test('accepts hardened HTML, API, and redirect responses', async () => {
  const secure = createSecureServer();
  const redirect = createRedirectServer();
  const secureAddress = await listen(secure);
  const redirectAddress = await listen(redirect);

  const result = await runSmoke(
    `http://127.0.0.1:${secureAddress.port}`,
    `http://127.0.0.1:${redirectAddress.port}`,
  );

  await Promise.all([close(secure), close(redirect)]);
  assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /public security header smoke OK/);
});
test('rejects an exact server software version on the HTTP edge', async () => {
  const secure = createSecureServer();
  const redirect = createRedirectServer('nginx/1.30.4');
  const secureAddress = await listen(secure);
  const redirectAddress = await listen(redirect);

  const result = await runSmoke(
    `http://127.0.0.1:${secureAddress.port}`,
    `http://127.0.0.1:${redirectAddress.port}`,
  );

  await Promise.all([close(secure), close(redirect)]);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /server header exposes an exact software version/);
});

test('rejects a response without required CSP safety directives', async () => {
  const incompleteHeaders = { ...requiredHeaders };
  delete incompleteHeaders['Content-Security-Policy'];
  const secure = createSecureServer(incompleteHeaders);
  const redirect = createRedirectServer();
  const secureAddress = await listen(secure);
  const redirectAddress = await listen(redirect);

  const result = await runSmoke(
    `http://127.0.0.1:${secureAddress.port}`,
    `http://127.0.0.1:${redirectAddress.port}`,
  );

  await Promise.all([close(secure), close(redirect)]);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /content-security-policy/);
});
