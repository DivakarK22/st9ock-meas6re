function sma(values, period) {
  if (!Array.isArray(values) || values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((sum, v) => sum + v, 0) / period;
}

function ema(values, period) {
  if (!Array.isArray(values) || values.length < period) return null;
  const k = 2 / (period + 1);
  let current = values.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
  for (let i = period; i < values.length; i += 1) {
    current = values[i] * k + current * (1 - k);
  }
  return current;
}

function stdev(values) {
  if (!values.length) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function rsi(closes, period = 14) {
  if (!Array.isArray(closes) || closes.length <= period) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i += 1) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function trueRange(current, previous) {
  return Math.max(
    current.high - current.low,
    Math.abs(current.high - previous.close),
    Math.abs(current.low - previous.close)
  );
}

function atr(candles, period = 14) {
  if (!Array.isArray(candles) || candles.length <= period) return null;
  const ranges = [];
  for (let i = candles.length - period; i < candles.length; i += 1) {
    ranges.push(trueRange(candles[i], candles[i - 1]));
  }
  return ranges.reduce((sum, v) => sum + v, 0) / period;
}

function bollinger(closes, period = 20, multiplier = 2) {
  const middle = sma(closes, period);
  if (middle == null) return null;
  const slice = closes.slice(-period);
  const deviation = stdev(slice);
  return {
    middle,
    upper: middle + multiplier * deviation,
    lower: middle - multiplier * deviation,
  };
}

function macd(closes, fast = 12, slow = 26, signal = 9) {
  if (closes.length < slow + signal) return null;
  const macdLine = ema(closes, fast) - ema(closes, slow);
  const macdSeries = [];
  for (let i = slow; i <= closes.length; i += 1) {
    const window = closes.slice(0, i);
    macdSeries.push(ema(window, fast) - ema(window, slow));
  }
  const signalLine = ema(macdSeries, signal);
  return {
    macd: macdLine,
    signal: signalLine,
    histogram: macdLine - signalLine,
  };
}

function highest(values) {
  return values.reduce((max, v) => (v > max ? v : max), values[0]);
}

function lowest(values) {
  return values.reduce((min, v) => (v < min ? v : min), values[0]);
}

function classicPivots(previous) {
  const pivot = (previous.high + previous.low + previous.close) / 3;
  const r1 = 2 * pivot - previous.low;
  const s1 = 2 * pivot - previous.high;
  const r2 = pivot + (previous.high - previous.low);
  const s2 = pivot - (previous.high - previous.low);
  const r3 = previous.high + 2 * (pivot - previous.low);
  const s3 = previous.low - 2 * (previous.high - pivot);
  return { pivot, r1, r2, r3, s1, s2, s3 };
}

function fibonacciLevels(high, low) {
  const range = high - low;
  return {
    high,
    low,
    range,
    level236: high - range * 0.236,
    level382: high - range * 0.382,
    level50: high - range * 0.5,
    level618: high - range * 0.618,
    level786: high - range * 0.786,
  };
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

module.exports = {
  sma,
  ema,
  stdev,
  rsi,
  atr,
  bollinger,
  macd,
  highest,
  lowest,
  classicPivots,
  fibonacciLevels,
  round2,
};
