import http from 'node:http';

const port = Number(process.env.CLIP_E2E_MOCK_PORT || 18001);
const host = process.env.CLIP_E2E_MOCK_HOST || '127.0.0.1';
const publicBaseUrl = (process.env.CLIP_E2E_PUBLIC_BASE_URL || `http://127.0.0.1:${port}`).replace(/\/$/, '');
const checkouts = new Map();

const server = http.createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/v2/checkout') {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      let payload;
      try {
        payload = JSON.parse(body || '{}');
      } catch {
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ message: 'invalid JSON' }));
        return;
      }

      const amount = Number(payload.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        response.writeHead(422, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ message: 'invalid amount' }));
        return;
      }

      const id = `local-checkout-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      checkouts.set(id, {
        amount,
        currency: payload.currency || 'MXN',
        metadata: payload.metadata || {},
      });
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({
        payment_request_id: id,
        payment_request_url: `${publicBaseUrl}/checkout/${id}`,
      }));
    });
    return;
  }

  if (request.method === 'GET' && request.url?.startsWith('/v2/checkout/')) {
    const id = request.url.split('/').pop();
    const checkout = checkouts.get(id);
    if (!checkout) {
      response.writeHead(404, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ message: 'unknown checkout' }));
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({
      payment_request_id: id,
      object_type: 'payment_link',
      status: 'CHECKOUT_COMPLETED',
      amount: checkout.amount,
      currency: checkout.currency,
      metadata: checkout.metadata,
    }));
    return;
  }

  if (request.method === 'GET' && request.url?.startsWith('/checkout/')) {
    const id = request.url.split('/').pop();
    const exists = checkouts.has(id);
    response.writeHead(exists ? 200 : 404, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(exists
      ? '<!doctype html><title>Clip local checkout</title><h1>Clip local checkout</h1>'
      : '<!doctype html><title>Not found</title><h1>Not found</h1>');
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  response.writeHead(404);
  response.end('not found');
});

server.listen(port, host, () => {
  console.log(`Clip E2E mock listening on ${host}:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
