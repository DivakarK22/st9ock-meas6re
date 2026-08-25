const {
  sma,
  ema,
  rsi,
  atr,
  bollinger,
  macd,
  highest,
  lowest,
  classicPivots,
  fibonacciLevels,
  round2,
} = require('./indicators');

function last(values) {
  return values[values.length - 1];
}

function clampRange(low, high) {
  if (low <= high) return { low: round2(low), high: round2(high) };
  return { low: round2(high), high: round2(low) };
}

function buildSnapshot(candles) {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume || 0);
  const price = last(closes);
  const previous = candles[candles.length - 2] || candles[candles.length - 1];
  const lookback52 = candles.slice(-252);
  const high52 = highest(lookback52.map((c) => c.high));
  const low52 = lowest(lookback52.map((c) => c.low));

  return {
    price,
    previous,
    closes,
    highs,
    lows,
    volumes,
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    sma200: sma(closes, Math.min(200, closes.length)),
    ema9: ema(closes, 9),
    ema21: ema(closes, 21),
    rsi: rsi(closes, 14),
    atr: atr(candles, 14),
    bollinger: bollinger(closes, 20, 2),
    macd: macd(closes),
    high52,
    low52,
    avgVolume: sma(volumes, Math.min(20, volumes.length)),
    volume: last(volumes),
    changePct: previous ? ((price - previous.close) / previous.close) * 100 : 0,
  };
}

function trendBias(snapshot) {
  const { price, sma20, sma50, sma200, ema9, ema21, macd: macdValue } = snapshot;
  let score = 0;
  if (sma20 && price > sma20) score += 1;
  else if (sma20 && price < sma20) score -= 1;
  if (sma50 && price > sma50) score += 1;
  else if (sma50 && price < sma50) score -= 1;
  if (sma200 && price > sma200) score += 2;
  else if (sma200 && price < sma200) score -= 2;
  if (ema9 && ema21 && ema9 > ema21) score += 1;
  else if (ema9 && ema21 && ema9 < ema21) score -= 1;
  if (macdValue && macdValue.histogram > 0) score += 1;
  else if (macdValue && macdValue.histogram < 0) score -= 1;
  if (score >= 2) return 'uptrend';
  if (score <= -2) return 'downtrend';
  return 'sideways';
}

function actionFromSetup({ horizon, bias, rsiValue, price, buy, sell }) {
  if (rsiValue != null && rsiValue >= 75 && price >= sell.low) {
    return { action: 'SELL / BOOK', reason: 'Stretched RSI near resistance / sell zone' };
  }
  if (rsiValue != null && rsiValue <= 30 && price <= buy.high) {
    return { action: 'BUY / ACCUMULATE', reason: 'Oversold RSI inside support / buy zone' };
  }
  if (bias === 'uptrend' && price >= buy.low && price <= buy.high) {
    return {
      action: horizon === 'intraday' ? 'BUY DIP' : 'ACCUMULATE',
      reason: 'Uptrend pullback into buy range',
    };
  }
  if (bias === 'downtrend' && price >= sell.low && price <= sell.high) {
    return {
      action: horizon === 'intraday' ? 'SELL RALLY' : 'REDUCE / AVOID FRESH LONGS',
      reason: 'Downtrend bounce into sell range',
    };
  }
  if (price > sell.high) {
    return { action: 'WAIT', reason: 'Price extended above sell range' };
  }
  if (price < buy.low) {
    return { action: 'WAIT', reason: 'Price below buy range; wait for reclaim' };
  }
  return { action: 'HOLD / WATCH', reason: 'Price is between buy and sell zones' };
}

function confidenceScore(snapshot, bias) {
  let score = 45;
  if (snapshot.atr && snapshot.price) {
    const vol = snapshot.atr / snapshot.price;
    if (vol > 0.012 && vol < 0.045) score += 10;
  }
  if (snapshot.avgVolume && snapshot.volume > snapshot.avgVolume * 1.2) score += 8;
  if (bias !== 'sideways') score += 12;
  if (snapshot.rsi != null && snapshot.rsi > 40 && snapshot.rsi < 65) score += 8;
  if (snapshot.sma200 && snapshot.sma50) score += 5;
  return Math.max(20, Math.min(92, Math.round(score)));
}

function analyzeCandles(candles, { horizon = 'intraday' } = {}) {
  if (!Array.isArray(candles) || candles.length < 30) {
    throw new Error('Need at least 30 candles to analyse ranges');
  }

  const snapshot = buildSnapshot(candles);
  const bias = trendBias(snapshot);
  const atrValue = snapshot.atr || snapshot.price * 0.015;
  const previous = snapshot.previous;
  const pivots = classicPivots(previous);
  const fib = fibonacciLevels(snapshot.high52, snapshot.low52);

  let buy;
  let sell;
  let stopLoss;
  let targets;

  if (horizon === 'intraday') {
    if (bias === 'uptrend') {
      buy = clampRange(pivots.s1 - atrValue * 0.15, pivots.pivot);
      sell = clampRange(pivots.r1, pivots.r2);
    } else if (bias === 'downtrend') {
      buy = clampRange(pivots.s2, pivots.s1);
      sell = clampRange(pivots.pivot, pivots.r1 + atrValue * 0.15);
    } else {
      buy = clampRange(pivots.s1, pivots.pivot - atrValue * 0.1);
      sell = clampRange(pivots.pivot + atrValue * 0.1, pivots.r1);
    }
    stopLoss = round2(buy.low - atrValue * 0.6);
    targets = [round2(sell.low), round2(sell.high), round2(pivots.r2)];
  } else {
    const longBuyLow = Math.max(snapshot.low52, fib.level618, snapshot.sma200 || fib.level618);
    const longBuyHigh = Math.max(fib.level50, snapshot.sma50 || fib.level50);
    const longSellLow = Math.min(fib.level236, snapshot.bollinger?.upper || fib.level236);
    const longSellHigh = snapshot.high52;
    buy = clampRange(longBuyLow, longBuyHigh);
    sell = clampRange(longSellLow, longSellHigh);
    stopLoss = round2(Math.max(snapshot.low52, buy.low - atrValue * 2));
    targets = [
      round2(snapshot.sma20 || sell.low),
      round2(sell.low),
      round2(sell.high),
    ];
  }

  const decision = actionFromSetup({
    horizon,
    bias,
    rsiValue: snapshot.rsi,
    price: snapshot.price,
    buy,
    sell,
  });

  return {
    horizon,
    lastPrice: round2(snapshot.price),
    changePct: round2(snapshot.changePct),
    bias,
    action: decision.action,
    reason: decision.reason,
    confidence: confidenceScore(snapshot, bias),
    buyRange: buy,
    sellRange: sell,
    stopLoss,
    targets,
    indicators: {
      rsi: snapshot.rsi != null ? round2(snapshot.rsi) : null,
      atr: snapshot.atr != null ? round2(snapshot.atr) : null,
      sma20: snapshot.sma20 != null ? round2(snapshot.sma20) : null,
      sma50: snapshot.sma50 != null ? round2(snapshot.sma50) : null,
      sma200: snapshot.sma200 != null ? round2(snapshot.sma200) : null,
      ema9: snapshot.ema9 != null ? round2(snapshot.ema9) : null,
      ema21: snapshot.ema21 != null ? round2(snapshot.ema21) : null,
      bollinger: snapshot.bollinger
        ? {
            upper: round2(snapshot.bollinger.upper),
            middle: round2(snapshot.bollinger.middle),
            lower: round2(snapshot.bollinger.lower),
          }
        : null,
      macd: snapshot.macd
        ? {
            macd: round2(snapshot.macd.macd),
            signal: round2(snapshot.macd.signal),
            histogram: round2(snapshot.macd.histogram),
          }
        : null,
      high52: round2(snapshot.high52),
      low52: round2(snapshot.low52),
    },
    pivots: {
      pivot: round2(pivots.pivot),
      r1: round2(pivots.r1),
      r2: round2(pivots.r2),
      r3: round2(pivots.r3),
      s1: round2(pivots.s1),
      s2: round2(pivots.s2),
      s3: round2(pivots.s3),
    },
    fibonacci: {
      level236: round2(fib.level236),
      level382: round2(fib.level382),
      level50: round2(fib.level50),
      level618: round2(fib.level618),
      level786: round2(fib.level786),
    },
  };
}

function opportunityScore(analysis) {
  let score = analysis.confidence;
  if (analysis.action.includes('BUY')) score += 12;
  if (analysis.action.includes('SELL') && analysis.horizon === 'intraday') score += 8;
  if (analysis.bias === 'sideways') score -= 8;
  if (analysis.indicators.rsi != null) {
    if (analysis.indicators.rsi < 35 || analysis.indicators.rsi > 70) score += 6;
  }
  return Math.max(0, Math.min(100, score));
}

module.exports = {
  analyzeCandles,
  opportunityScore,
  buildSnapshot,
};
