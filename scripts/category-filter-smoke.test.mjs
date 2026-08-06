import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address())));
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function runSmoke(baseUrl) {
  return new Promise((resolve) => {
    const child = spawn('bash', ['scripts/category-filter-smoke.sh'], {
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

const validRow = {
  id: 1,
  price: 1000,
  created_at: '2026-08-06T12:00:00Z',
  user: { is_verified: true },
  attributes: {
    year: 2024,
    kms: 30000,
    area: 120,
    rooms: 3,
    bathrooms: 2,
    salary: 30000,
  },
};

function createJsonServer(payload) {
  return createServer((request, response) => {
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(payload));
  });
}

test('accepts non-empty filter results whose values satisfy every range', async () => {
  const server = createJsonServer({ total: 1, data: [validRow] });
  const address = await listen(server);
  const result = await runSmoke(`http://127.0.0.1:${address.port}`);
  await close(server);

  assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /category filter smoke OK/);
});

test('rejects a successful HTTP response with an empty filter result', async () => {
  const server = createJsonServer({ total: 0, data: [] });
  const address = await listen(server);
  const result = await runSmoke(`http://127.0.0.1:${address.port}`);
  await close(server);

  assert.notEqual(result.code, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /returned no rows|empty result set/);
});

test('rejects an attribute value outside the requested range', async () => {
  const invalidRow = {
    ...validRow,
    attributes: { ...validRow.attributes, year: 1900 },
  };
  const server = createJsonServer({ total: 1, data: [invalidRow] });
  const address = await listen(server);
  const result = await runSmoke(`http://127.0.0.1:${address.port}`);
  await close(server);

  assert.notEqual(result.code, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /outside \[2015\.0, 2026\.0\]/);
});
