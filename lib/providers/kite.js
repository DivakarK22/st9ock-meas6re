const KITE_ROOT = 'https://api.kite.trade';
const KITE_LOGIN = 'https://kite.zerodha.com/connect/login';

function configFromEnv(env = process.env) {
  return {
    apiKey: env.KITE_API_KEY || '',
    apiSecret: env.KITE_API_SECRET || '',
    accessToken: env.KITE_ACCESS_TOKEN || '',
  };
}

function loginUrl(apiKey) {
  return `${KITE_LOGIN}?v=3&api_key=${encodeURIComponent(apiKey)}`;
}

async function kiteRequest(path, { apiKey, accessToken, method = 'GET', body } = {}) {
  if (!apiKey || !accessToken) {
    throw new Error('Kite API key and access token are required');
  }
  const response = await fetch(`${KITE_ROOT}${path}`, {
    method,
    headers: {
      'X-Kite-Version': '3',
      Authorization: `token ${apiKey}:${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.status === 'error') {
    throw new Error(payload?.message || `Kite request failed (${response.status})`);
  }
  return payload.data;
}

async function createSession({ apiKey, apiSecret, requestToken }) {
  const crypto = require('node:crypto');
  const checksum = crypto
    .createHash('sha256')
    .update(`${apiKey}${requestToken}${apiSecret}`)
    .digest('hex');
  const body = new URLSearchParams({
    api_key: apiKey,
    request_token: requestToken,
    checksum,
  });
  const response = await fetch(`${KITE_ROOT}/session/token`, {
    method: 'POST',
    headers: {
      'X-Kite-Version': '3',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.status === 'error') {
    throw new Error(payload?.message || 'Kite login failed');
  }
  return payload.data;
}

function intervalForHorizon(horizon) {
  return horizon === 'intraday' ? '5minute' : 'day';
}

function fromToForHorizon(horizon) {
  const to = new Date();
  const from = new Date(to);
  if (horizon === 'intraday') from.setDate(from.getDate() - 10);
  else from.setFullYear(from.getFullYear() - 2);
  const fmt = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
  return { from: fmt(from), to: fmt(to) };
}

function parseInstrumentsCsv(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  const idx = Object.fromEntries(headers.map((h, i) => [h.trim(), i]));
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',');
    const exchange = cols[idx.exchange];
    const instrumentType = cols[idx.instrument_type];
    if (!['NSE', 'BSE'].includes(exchange)) continue;
    if (instrumentType && instrumentType !== 'EQ') continue;
    rows.push({
      instrumentToken: Number(cols[idx.instrument_token]),
      exchangeToken: Number(cols[idx.exchange_token]),
      tradingsymbol: cols[idx.tradingsymbol],
      name: cols[idx.name],
      exchange,
      lotSize: Number(cols[idx.lot_size] || 1),
      tickSize: Number(cols[idx.tick_size] || 0.05),
    });
  }
  return rows;
}

async function fetchKiteInstruments({ apiKey, accessToken, exchange }) {
  const suffix = exchange ? `/${exchange}` : '';
  const response = await fetch(`${KITE_ROOT}/instruments${suffix}`, {
    headers: {
      'X-Kite-Version': '3',
      Authorization: `token ${apiKey}:${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Kite instruments failed (${response.status})`);
  }
  const csvText = await response.text();
  return parseInstrumentsCsv(csvText);
}

async function fetchKiteQuote({ apiKey, accessToken, kiteKey }) {
  const data = await kiteRequest(`/quote?i=${encodeURIComponent(kiteKey)}`, {
    apiKey,
    accessToken,
  });
  return data?.[kiteKey] || null;
}

async function fetchKiteCandles({ apiKey, accessToken, instrumentToken, horizon }) {
  const interval = intervalForHorizon(horizon);
  const { from, to } = fromToForHorizon(horizon);
  const path = `/instruments/historical/${instrumentToken}/${interval}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const data = await kiteRequest(path, { apiKey, accessToken });
  const candles = (data?.candles || []).map((row) => ({
    date: row[0],
    open: row[1],
    high: row[2],
    low: row[3],
    close: row[4],
    volume: row[5] || 0,
  }));
  if (candles.length < 30) {
    throw new Error('Insufficient Kite candles');
  }
  return candles;
}

module.exports = {
  configFromEnv,
  loginUrl,
  createSession,
  parseInstrumentsCsv,
  fetchKiteInstruments,
  fetchKiteQuote,
  fetchKiteCandles,
};
