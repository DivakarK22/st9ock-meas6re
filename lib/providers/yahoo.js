const DEFAULT_TIMEOUT_MS = 12000;

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BharatMarketAnalyst/1.0)',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function intervalForHorizon(horizon) {
  return horizon === 'intraday' ? '5m' : '1d';
}

function rangeForHorizon(horizon) {
  return horizon === 'intraday' ? '5d' : '2y';
}

function mapYahooCandles(result) {
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const candles = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    if ([open, high, low, close].some((v) => v == null || Number.isNaN(v))) continue;
    candles.push({
      date: new Date(timestamps[i] * 1000).toISOString(),
      open,
      high,
      low,
      close,
      volume: quote.volume?.[i] || 0,
    });
  }
  return candles;
}

async function fetchYahooCandles(yahooSymbol, horizon) {
  const interval = intervalForHorizon(horizon);
  const range = rangeForHorizon(horizon);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}&includePrePost=false`;
  const payload = await fetchJson(url);
  const result = payload?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No Yahoo data for ${yahooSymbol}`);
  }
  const candles = mapYahooCandles(result);
  if (candles.length < 30) {
    throw new Error(`Insufficient Yahoo candles for ${yahooSymbol}`);
  }
  const meta = result.meta || {};
  return {
    source: 'yahoo',
    symbol: yahooSymbol,
    exchangeName: meta.exchangeName,
    currency: meta.currency || 'INR',
    candles,
    lastPrice: candles[candles.length - 1].close,
  };
}

module.exports = {
  fetchYahooCandles,
  mapYahooCandles,
};
