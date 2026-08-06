import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';

function runSmoke(baseUrl) {
  return new Promise((resolve) => {
    const child = spawn('bash', ['scripts/session-cookie-smoke.sh'], {
      cwd: process.cwd(),
      env: { ...process.env, BASE_URL: baseUrl },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

test('accepts standard CRLF Set-Cookie headers with SameSite', async () => {
  const server = createServer((request, response) => {
    assert.equal(request.url, '/sanctum/csrf-cookie');
    response.setHeader('Set-Cookie', [
      'XSRF-TOKEN=test; Max-Age=7200; Path=/; Secure; SameSite=Lax',
      'mercasto_session=test; Max-Age=7200; Path=/; Secure; HttpOnly; SameSite=Lax',
    ]);
    response.statusCode = 204;
    response.end();
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const result = await runSmoke(`http://127.0.0.1:${address.port}`);
  await new Promise((resolve) => server.close(resolve));

  assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /session cookie smoke OK/);
});
