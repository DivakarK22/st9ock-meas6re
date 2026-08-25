const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sma, rsi, atr, classicPivots, fibonacciLevels } = require('../lib/indicators');
const { analyzeCandles } = require('../lib/ranges');
const { generateCandles } = require('../lib/providers/demo');
const { findInstrument, instrumentsForScan } = require('../lib/universe');

describe('indicators', () => {
  it('computes SMA', () => {
    assert.equal(sma([1, 2, 3, 4, 5], 5), 3);
  });

  it('computes RSI bounds', () => {
    const up = Array.from({ length: 20 }, (_, i) => 10 + i);
    const value = rsi(up, 14);
    assert.ok(value > 70);
  });

  it('computes ATR and pivots', () => {
    const candles = generateCandles('NSE:INFY', 'intraday');
    const value = atr(candles, 14);
    assert.ok(value > 0);
    const pivots = classicPivots(candles[candles.length - 2]);
    assert.ok(pivots.r1 > pivots.pivot);
    assert.ok(pivots.s1 < pivots.pivot);
  });

  it('builds fibonacci retracements', () => {
    const fib = fibonacciLevels(200, 100);
    assert.equal(fib.level50, 150);
  });
});

describe('ranges', () => {
  it('returns buy and sell ranges for intraday and long term', () => {
    const candles = generateCandles('NSE:RELIANCE', 'intraday');
    const intra = analyzeCandles(candles, { horizon: 'intraday' });
    const long = analyzeCandles(candles, { horizon: 'longterm' });
    assert.ok(intra.buyRange.low <= intra.buyRange.high);
    assert.ok(intra.sellRange.low <= intra.sellRange.high);
    assert.ok(long.buyRange.low <= long.buyRange.high);
    assert.ok(['uptrend', 'downtrend', 'sideways'].includes(intra.bias));
    assert.ok(intra.confidence >= 20);
  });

  it('rejects short histories', () => {
    assert.throws(() => analyzeCandles([{ close: 1 }], { horizon: 'intraday' }));
  });
});

describe('universe', () => {
  it('resolves NSE and BSE symbols', () => {
    const nse = findInstrument('reliance');
    assert.equal(nse.exchange, 'NSE');
    assert.equal(nse.yahooSymbol, 'RELIANCE.NS');
    const bse = findInstrument('BSE:TCS');
    assert.equal(bse.kiteKey, 'BSE:TCS');
    assert.ok(instrumentsForScan({ exchange: 'ALL' }).length > 50);
  });
});
