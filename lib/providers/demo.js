function hashSymbol(symbol) {
  let hash = 2166136261;
  const text = String(symbol || 'NSE');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function generateCandles(symbol, horizon = 'intraday') {
  const random = mulberry32(hashSymbol(symbol) + (horizon === 'intraday' ? 11 : 29));
  const count = horizon === 'intraday' ? 180 : 320;
  let price = 80 + (hashSymbol(symbol) % 2400);
  const candles = [];
  const start = Date.now() - count * (horizon === 'intraday' ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000);

  for (let i = 0; i < count; i += 1) {
    const drift = (random() - 0.48) * (price * 0.012);
    const open = price;
    const close = Math.max(8, open + drift);
    const high = Math.max(open, close) * (1 + random() * 0.008);
    const low = Math.min(open, close) * (1 - random() * 0.008);
    candles.push({
      date: new Date(start + i * (horizon === 'intraday' ? 300000 : 86400000)).toISOString(),
      open,
      high,
      low,
      close,
      volume: Math.round(200000 + random() * 4000000),
    });
    price = close;
  }
  return candles;
}

function fetchDemoCandles(instrument, horizon) {
  const candles = generateCandles(instrument.kiteKey, horizon);
  return {
    source: 'demo',
    symbol: instrument.kiteKey,
    currency: 'INR',
    candles,
    lastPrice: candles[candles.length - 1].close,
  };
}

module.exports = {
  generateCandles,
  fetchDemoCandles,
};
