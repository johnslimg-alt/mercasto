import http from 'node:http';

const host = process.env.OLLAMA_E2E_MOCK_HOST || '0.0.0.0';
const port = Number(process.env.OLLAMA_E2E_MOCK_PORT || 11434);
const description = 'Descripción segura generada por el fallback local E2E. Escríbeme para más información.';

const server = http.createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (request.method === 'POST' && (request.url === '/api/chat' || request.url === '/api/generate')) {
    for await (const _chunk of request) {
      // Drain the request body; the mock response is deterministic.
    }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(request.url === '/api/chat'
      ? { message: { role: 'assistant', content: description }, done: true }
      : { response: description, done: true }));
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'not_found' }));
});

server.listen(port, host, () => {
  console.log(`Ollama E2E mock listening on ${host}:${port}`);
});
