const { instrumentsForScan, findInstrument } = require('./universe');
const { analyzeCandles, opportunityScore } = require('./ranges');
const { fetchYahooCandles } = require('./providers/yahoo');
const { fetchDemoCandles } = require('./providers/demo');
const kite = require('./providers/kite');

const cache = new Map();
const CACHE_MS = 5 * 60 * 1000;
let kiteSession = kite.configFromEnv();
let kiteInstrumentIndex = null;

function cacheKey(parts) {
  return parts.join('|');
}

function getCached(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function setCached(key, value) {
  cache.set(key, { at: Date.now(), value });
  return value;
}

function preferredSource() {
  if (process.env.MARKET_PROVIDER === 'demo') return 'demo';
  if (kiteSession.apiKey && kiteSession.accessToken) return 'kite';
  return 'yahoo';
}

function providerStatus() {
  const source = preferredSource();
  const kiteReady = source === 'kite';
  const notes = {
    kite: 'Using Zerodha Kite Connect for quotes and candles.',
    yahoo: 'Kite access token not set. Live candles come from Yahoo Finance (NSE .NS / BSE .BO).',
    demo: 'Demo mode: deterministic candles so the analyser can run without market credentials.',
  };
  return {
    kiteConfigured: Boolean(kiteSession.apiKey),
    kiteReady,
    fallback: source,
    note: notes[source],
  };
}

function setKiteSession(partial) {
  kiteSession = { ...kiteSession, ...partial };
  kiteInstrumentIndex = null;
  return providerStatus();
}

async function loadKiteInstruments() {
  if (kiteInstrumentIndex) return kiteInstrumentIndex;
  const rows = await kite.fetchKiteInstruments({
    apiKey: kiteSession.apiKey,
    accessToken: kiteSession.accessToken,
  });
  const byKey = new Map();
  for (const row of rows) {
    byKey.set(`${row.exchange}:${row.tradingsymbol}`, row);
  }
  kiteInstrumentIndex = { rows, byKey };
  return kiteInstrumentIndex;
}

async function candlesFromKite(instrument, horizon) {
  const index = await loadKiteInstruments();
  const row = index.byKey.get(instrument.kiteKey);
  if (!row) {
    throw new Error(`Instrument ${instrument.kiteKey} not found in Kite dump`);
  }
  const candles = await kite.fetchKiteCandles({
    apiKey: kiteSession.apiKey,
    accessToken: kiteSession.accessToken,
    instrumentToken: row.instrumentToken,
    horizon,
  });
  return {
    source: 'kite',
    symbol: instrument.kiteKey,
    name: row.name || instrument.name,
    candles,
    lastPrice: candles[candles.length - 1].close,
  };
}

async function loadSeries(instrument, horizon) {
  const source = preferredSource();
  const key = cacheKey(['series', instrument.kiteKey, horizon, source]);
  const cached = getCached(key);
  if (cached) return cached;

  if (source === 'demo') {
    return setCached(key, fetchDemoCandles(instrument, horizon));
  }

  if (source === 'kite') {
    try {
      return setCached(key, await candlesFromKite(instrument, horizon));
    } catch (error) {
      try {
        const yahoo = await fetchYahooCandles(instrument.yahooSymbol, horizon);
        return setCached(key, { ...yahoo, kiteError: error.message });
      } catch {
        return setCached(key, {
          ...fetchDemoCandles(instrument, horizon),
          kiteError: error.message,
        });
      }
    }
  }

  try {
    return setCached(key, await fetchYahooCandles(instrument.yahooSymbol, horizon));
  } catch (error) {
    return setCached(key, {
      ...fetchDemoCandles(instrument, horizon),
      yahooError: error.message,
    });
  }
}

async function analyzeInstrument(query, horizon = 'intraday') {
  const instrument = findInstrument(query);
  const series = await loadSeries(instrument, horizon);
  const analysis = analyzeCandles(series.candles, { horizon });
  return {
    instrument,
    source: series.source,
    currency: series.currency || 'INR',
    kiteError: series.kiteError,
    candleCount: series.candles.length,
    analysis,
    score: opportunityScore(analysis),
  };
}

async function mapPool(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      try {
        results[index] = await mapper(items[index], index);
      } catch (error) {
        results[index] = { error: error.message, instrument: items[index] };
      }
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function scanMarket({ horizon = 'intraday', exchange = 'NSE', limit = 40 } = {}) {
  const universe = instrumentsForScan({ exchange });
  const slice = universe.slice(0, Math.min(Number(limit) || 40, universe.length));
  const key = cacheKey(['scan', horizon, exchange, slice.length, providerStatus().fallback]);
  const cached = getCached(key);
  if (cached) return cached;

  const raw = await mapPool(slice, 6, async (instrument) => {
    const result = await analyzeInstrument(`${instrument.exchange}:${instrument.symbol}`, horizon);
    return {
      symbol: instrument.symbol,
      name: instrument.name,
      exchange: instrument.exchange,
      source: result.source,
      lastPrice: result.analysis.lastPrice,
      changePct: result.analysis.changePct,
      bias: result.analysis.bias,
      action: result.analysis.action,
      confidence: result.analysis.confidence,
      score: result.score,
      buyRange: result.analysis.buyRange,
      sellRange: result.analysis.sellRange,
      stopLoss: result.analysis.stopLoss,
      rsi: result.analysis.indicators.rsi,
    };
  });

  const ideas = raw.filter((row) => !row.error);
  const failures = raw.filter((row) => row.error).map((row) => ({
    symbol: row.instrument?.symbol,
    exchange: row.instrument?.exchange,
    error: row.error,
  }));
  ideas.sort((a, b) => b.score - a.score);

  return setCached(key, {
    horizon,
    exchange,
    scanned: slice.length,
    succeeded: ideas.length,
    failed: failures.length,
    ideas,
    failures: failures.slice(0, 12),
  });
}

module.exports = {
  providerStatus,
  setKiteSession,
  analyzeInstrument,
  scanMarket,
  kite,
};
