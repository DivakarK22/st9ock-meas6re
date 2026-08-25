const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sma, rsi, atr, classicPivots, fibonacciLevels } = require('../lib/indicators');
const { analyzeCandles } = require('../lib/ranges');
const { generateCandles } = require('../lib/providers/demo');
const { findInstrument, instrumentsForScan } = require('../lib/universe');
const { nextTradingSession, suggestTiming, isBuyAction } = require('../lib/timing');

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

describe('timing', () => {
  it('rolls to the next weekday session after the cash close', () => {
    const session = nextTradingSession(new Date('2026-08-26T11:00:00Z'));
    assert.equal(session.date, '2026-08-27');
    assert.equal(session.squareOff, '15:10');
  });

  it('skips the weekend after Friday close', () => {
    const session = nextTradingSession(new Date('2026-08-28T11:00:00Z'));
    assert.equal(session.date, '2026-08-31');
  });

  it('gives an IST buy window and 15:10 sell-by for an intraday buy', () => {
    const candles = generateCandles('NSE:HCLTECH', 'intraday');
    const analysis = analyzeCandles(candles, { horizon: 'intraday' });
    analysis.action = 'BUY DIP';
    analysis.bias = 'uptrend';
    const timing = suggestTiming(analysis, new Date('2026-08-25T04:00:00Z'));
    assert.equal(timing.side, 'buy');
    assert.ok(timing.buyWindow.start);
    assert.equal(timing.sellBy, '15:10 IST');
    assert.equal(timing.session.date, '2026-08-25');
    assert.equal(isBuyAction('ACCUMULATE'), true);
    assert.equal(isBuyAction('REDUCE / AVOID FRESH LONGS'), false);
  });

  it('gives a review date for long-term sells', () => {
    const candles = generateCandles('NSE:TCS', 'longterm');
    const analysis = analyzeCandles(candles, { horizon: 'longterm' });
    analysis.action = 'ACCUMULATE';
    const timing = suggestTiming(analysis, new Date('2026-08-25T04:00:00Z'));
    assert.match(timing.sellBy, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(timing.hold.includes('trading days'));
  });
});
