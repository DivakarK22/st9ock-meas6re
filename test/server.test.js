const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.PORT = '3456';
process.env.MARKET_PROVIDER = 'demo';

const app = require('../server');
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
  server = app.listen(PORT, '127.0.0.1');
  await new Promise((resolve) => server.on('listening', resolve));
});

after(() => server.close());

describe('Bharat Market Analyst API', () => {
  it('returns health status', async () => {
    const res = await request('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'bharat-market-analyst');
    assert.equal(res.body.provider.fallback, 'demo');
  });

  it('analyses an NSE stock with buy and sell ranges', async () => {
    const res = await request('/api/analyze?symbol=NSE:RELIANCE&horizon=intraday');
    assert.equal(res.status, 200);
    assert.equal(res.body.instrument.symbol, 'RELIANCE');
    assert.ok(res.body.analysis.buyRange.low <= res.body.analysis.buyRange.high);
    assert.ok(res.body.analysis.sellRange.high > 0);
    assert.ok(res.body.analysis.stopLoss);
  });

  it('scans the market universe', async () => {
    const res = await request('/api/scan?horizon=longterm&exchange=NSE&limit=12');
    assert.equal(res.status, 200);
    assert.equal(res.body.succeeded, 12);
    assert.ok(res.body.ideas[0].buyRange);
    assert.ok(res.body.ideas[0].sellRange);
  });

  it('rejects analyse without a symbol', async () => {
    const res = await request('/api/analyze');
    assert.equal(res.status, 400);
  });
});
