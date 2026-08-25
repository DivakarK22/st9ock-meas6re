const express = require('express');
const path = require('path');
const { providerStatus, setKiteSession, analyzeInstrument, scanMarket, kite } = require('./market');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'bharat-market-analyst',
      provider: providerStatus(),
    });
  });

  app.get('/api/provider', (_req, res) => {
    res.json(providerStatus());
  });

  app.get('/api/kite/login-url', (_req, res) => {
    const status = providerStatus();
    const apiKey = process.env.KITE_API_KEY || '';
    if (!apiKey) {
      return res.status(400).json({
        error: 'Set KITE_API_KEY in the environment, then open the Kite login URL.',
      });
    }
    res.json({
      loginUrl: kite.loginUrl(apiKey),
      kiteConfigured: status.kiteConfigured,
    });
  });

  app.post('/api/kite/session', async (req, res) => {
    try {
      const requestToken = String(req.body?.requestToken || '').trim();
      const apiKey = process.env.KITE_API_KEY || '';
      const apiSecret = process.env.KITE_API_SECRET || '';
      if (!requestToken) {
        return res.status(400).json({ error: 'requestToken is required' });
      }
      if (!apiKey || !apiSecret) {
        return res.status(400).json({ error: 'KITE_API_KEY and KITE_API_SECRET must be set' });
      }
      const session = await kite.createSession({ apiKey, apiSecret, requestToken });
      setKiteSession({
        apiKey,
        apiSecret,
        accessToken: session.access_token,
      });
      res.json({
        ok: true,
        userId: session.user_id,
        userName: session.user_name,
        provider: providerStatus(),
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/analyze', async (req, res) => {
    try {
      const symbol = String(req.query.symbol || '').trim();
      const horizon = req.query.horizon === 'longterm' ? 'longterm' : 'intraday';
      if (!symbol) {
        return res.status(400).json({ error: 'symbol is required, e.g. NSE:RELIANCE' });
      }
      const result = await analyzeInstrument(symbol, horizon);
      res.json(result);
    } catch (error) {
      res.status(502).json({ error: error.message });
    }
  });

  app.get('/api/scan', async (req, res) => {
    try {
      const horizon = req.query.horizon === 'longterm' ? 'longterm' : 'intraday';
      const exchange = ['NSE', 'BSE', 'ALL'].includes(req.query.exchange)
        ? req.query.exchange
        : 'NSE';
      const limit = Math.min(120, Math.max(10, Number(req.query.limit) || 40));
      const result = await scanMarket({ horizon, exchange, limit });
      res.json(result);
    } catch (error) {
      res.status(502).json({ error: error.message });
    }
  });

  return app;
}

module.exports = { createApp };
