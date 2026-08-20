import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import test from 'node:test';

const approvedAiTitle = 'Mercasto | La plataforma de clasificados más moderna e inteligente con AI';
const homepage = `<!doctype html><html><head>
<title>${approvedAiTitle}</title>
<meta name="description" content="Compra y vende en México">
<script type="application/ld+json">{"@context":"https://schema.org"}</script>
</head><body>Mercasto</body></html>`;

function runWatch(mode, baseUrl) {
  return new Promise((resolve) => {
    const child = spawn('bash', ['scripts/public-production-watch.sh', mode], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        BASE_URL: baseUrl,
        WATCH_ATTEMPTS: '1',
        WATCH_DELAY_SECONDS: '0',
        WATCH_CONNECT_TIMEOUT: '1',
        WATCH_MAX_TIME: '2',
      },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address())));
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}
function createHealthyServer({ upStatus = 200 } = {}) {
  return createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');

    if (url.pathname === '/up') {
      response.statusCode = upStatus;
      response.end(upStatus === 200 ? 'ok' : 'unavailable');
      return;
    }
    if (url.pathname === '/' ) {
      response.statusCode = 200;
      response.setHeader('Content-Type', 'text/html');
      response.end(homepage);
      return;
    }
    if (url.pathname === '/api/categories') {
      response.statusCode = 200;
      response.end('[]');
      return;
    }
    if (url.pathname === '/api/ads') {
      response.statusCode = 200;
      response.end('{"data":[]}');
      return;
    }
    if (url.pathname === '/api/auth/providers') {
      response.statusCode = 200;
      response.end('{}');
      return;
    }
    if (url.pathname === '/sitemap.xml') {
      response.statusCode = 200;
      response.end('<?xml version="1.0"?><urlset><url><loc>https://example.test/</loc></url></urlset>');
      return;
    }
    if (url.pathname === '/robots.txt') {
      response.statusCode = 200;
      response.end('User-agent: *\nSitemap: https://example.test/sitemap.xml\n');
      return;
    }

    response.statusCode = 404;
    response.end('not found');
  });
}

test('approved AI title exceeds the former 70-character watch limit', () => {
  assert.ok([...approvedAiTitle].length > 70);
  assert.ok([...approvedAiTitle].length <= 160);
});

test('passes the complete read-only watch on a healthy endpoint set', async () => {
  const server = createHealthyServer();
  const address = await listen(server);
  const result = await runWatch('fallback', `http://127.0.0.1:${address.port}`);
  await close(server);

  assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /public production watch OK \(fallback\)/);
});

test('returns the dedicated fallback code when the external runner has no route', async () => {
  const socket = createServer();
  const address = await listen(socket);
  await close(socket);

  const result = await runWatch('external', `http://127.0.0.1:${address.port}`);
  assert.equal(result.code, 75, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /external runner could not establish an HTTP connection/);
});

test('fails normally on a real unexpected HTTP status', async () => {
  const server = createHealthyServer({ upStatus: 503 });
  const address = await listen(server);
  const result = await runWatch('external', `http://127.0.0.1:${address.port}`);
  await close(server);

  assert.equal(result.code, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /unexpected HTTP status/);
  assert.doesNotMatch(result.stderr, /external runner could not establish/);
});


test('auth provider smoke uses the public production URL without bypassing origin lockdown', () => {
  const smoke = readFileSync('scripts/auth-providers-smoke.sh', 'utf8');
  assert.match(smoke, /BASE_URL=\"\$\{BASE_URL:-https:\/\/mercasto\.com\}\"/);
  assert.match(smoke, /\"\$URL\"/);
  assert.doesNotMatch(smoke, /--resolve/);
  assert.doesNotMatch(smoke, /127\.0\.0\.1/);
});

test('workflow falls back only for the dedicated connectivity result', () => {
  const workflow = readFileSync('.github/workflows/autonomous-production-watch.yml', 'utf8');
  assert.match(workflow, /bash scripts\/public-production-watch\.sh external/);
  assert.match(workflow, /75\)[\s\S]*fallback_required=true/);
  assert.match(workflow, /needs\.public-watch\.outputs\.fallback_required == 'true'/);
  assert.match(workflow, /runs-on: \[self-hosted, linux\]/);
  assert.match(workflow, /bash scripts\/public-production-watch\.sh fallback/);
  assert.match(workflow, /needs\.fallback-watch\.result == 'failure'/);
  assert.doesNotMatch(workflow, /report-failure:[\s\S]*if: failure\(\)/);
});
