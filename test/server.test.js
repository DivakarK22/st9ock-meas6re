const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const PORT = 3456;
let server;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path,
        method: options.method || 'GET',
        headers: options.headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            body: body ? JSON.parse(body) : null,
          });
        });
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

before(async () => {
  process.env.PORT = String(PORT);
  server = require('../server');
  await new Promise((resolve) => setTimeout(resolve, 200));
});

after(() => {
  if (server?.close) server.close();
});

describe('Stock Measure API', () => {
  it('returns health status', async () => {
    const res = await request('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('creates a measurement', async () => {
    const res = await request('/api/measure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: 'AAPL', quantity: 5 }),
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.measurement.symbol, 'AAPL');
    assert.equal(res.body.measurement.quantity, 5);
    assert.ok(res.body.measurement.totalValue > 0);
  });

  it('rejects invalid measurements', async () => {
    const res = await request('/api/measure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: '', quantity: -1 }),
    });
    assert.equal(res.status, 400);
  });
});
