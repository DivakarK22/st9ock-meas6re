const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseInstrumentsCsv, loginUrl } = require('../lib/providers/kite');

describe('kite helpers', () => {
  it('builds a login URL', () => {
    assert.equal(
      loginUrl('abc123'),
      'https://kite.zerodha.com/connect/login?v=3&api_key=abc123'
    );
  });

  it('parses equity rows from the instruments dump', () => {
    const csv = [
      'instrument_token,exchange_token,tradingsymbol,name,last_price,expiry,strike,tick_size,lot_size,instrument_type,segment,exchange',
      '738561,2885,RELIANCE,RELIANCE,0,,,0.05,1,EQ,NSE,NSE',
      '123,1,NIFTY25AUGFUT,NIFTY,0,2025-08-28,0,0.05,50,FUT,NFO,NFO',
    ].join('\n');
    const rows = parseInstrumentsCsv(csv);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].tradingsymbol, 'RELIANCE');
    assert.equal(rows[0].instrumentToken, 738561);
  });
});
