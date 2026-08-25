const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { composeDailyEmail, rangeText, windowText } = require('../lib/email');
const { parseArgs, mailConfig } = require('../scripts/send-daily-email.js');

function sampleSuggestion(overrides = {}) {
  return {
    headline: 'Buy NSE:HCLTECH today',
    session: {
      weekday: 'Wed',
      date: '2026-08-26',
      open: '09:15',
      close: '15:30',
    },
    pick: {
      exchange: 'NSE',
      symbol: 'HCLTECH',
      action: 'BUY DIP',
      reason: 'Uptrend pullback into buy range',
      buyRange: { low: 1905.58, high: 1917.51 },
      sellRange: { low: 1930.46, high: 1938.93 },
      stopLoss: 1891.73,
      targets: [1930.46, 1938.93],
      timing: {
        buyWindow: { start: '09:20', end: '09:50', timezone: 'IST' },
        sellBy: '15:10 IST',
        note: 'Book T1/T2 or exit by 15:10 IST.',
      },
    },
    watch: [
      {
        exchange: 'NSE',
        symbol: 'LICI',
        action: 'BUY DIP',
        timing: {
          buyWindow: { start: '09:20', end: '09:50', timezone: 'IST' },
          sellBy: '15:10 IST',
        },
      },
    ],
    ...overrides,
  };
}

describe('email composer', () => {
  it('formats ranges and IST windows', () => {
    assert.equal(rangeText({ low: 10, high: 12 }), '₹10 – ₹12');
    assert.equal(
      windowText({ buyWindow: { start: '09:20', end: '09:50', timezone: 'IST' } }),
      '09:20–09:50 IST'
    );
  });

  it('builds a daily mail with buy window and sell-by time', () => {
    const mail = composeDailyEmail({
      to: 'dvkr22@gmail.com',
      intraday: sampleSuggestion(),
      longterm: sampleSuggestion({
        headline: 'Buy NSE:ASIANPAINT today',
        pick: {
          ...sampleSuggestion().pick,
          symbol: 'ASIANPAINT',
          timing: {
            buyWindow: { start: '09:20', end: '15:00', timezone: 'IST' },
            sellBy: '2026-09-07',
            note: 'Review by the sell date.',
          },
        },
      }),
    });
    assert.match(mail.subject, /HCLTECH/);
    assert.match(mail.text, /09:20–09:50 IST/);
    assert.match(mail.text, /15:10 IST/);
    assert.match(mail.html, /2026-09-07/);
    assert.match(mail.html, /dvkr22@gmail.com/);
  });
});

describe('email CLI helpers', () => {
  it('parses preview args', () => {
    const args = parseArgs(['--preview', '--exchange', 'BSE', '--limit', '12']);
    assert.equal(args.preview, true);
    assert.equal(args.exchange, 'BSE');
    assert.equal(args.limit, 12);
  });

  it('defaults the recipient when EMAIL_TO is unset', () => {
    const previous = process.env.EMAIL_TO;
    delete process.env.EMAIL_TO;
    try {
      assert.equal(mailConfig().to, 'dvkr22@gmail.com');
    } finally {
      if (previous == null) delete process.env.EMAIL_TO;
      else process.env.EMAIL_TO = previous;
    }
  });
});
