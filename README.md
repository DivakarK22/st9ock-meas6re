# Bharat Market Analyst

Scan liquid **NSE** and **BSE** stocks, then get suggested **buy range**, **sell range**, stop, and targets for **intraday** or **long-term** horizons.

This is a technical-analysis helper, not investment advice.

## What it does

- Analyses a symbol (example: `NSE:RELIANCE` or `BSE:TCS`).
- Scans a universe of liquid Indian equities and ranks setups.
- Uses pivots + ATR for intraday zones, and 52-week / Fibonacci / moving-average structure for longer-term zones.
- Prefers **Zerodha Kite Connect** when an access token is present.
- Falls back to Yahoo Finance (`.NS` / `.BO`), then deterministic demo candles if live data is unavailable.

## Run

```bash
npm install
npm start
```

Open http://localhost:3000

```bash
npm test
```

## Kite Connect (optional)

Create an app at [developers.kite.trade](https://developers.kite.trade/), then:

```bash
export KITE_API_KEY=your_key
export KITE_API_SECRET=your_secret
# after daily login:
export KITE_ACCESS_TOKEN=your_token
```

Login helper endpoints:

- `GET /api/kite/login-url`
- `POST /api/kite/session` with `{ "requestToken": "..." }`

Force demo candles (useful in CI):

```bash
export MARKET_PROVIDER=demo
```

## API

- `GET /api/health`
- `GET /api/analyze?symbol=NSE:INFY&horizon=intraday|longterm`
- `GET /api/scan?exchange=NSE|BSE|ALL&horizon=intraday|longterm&limit=40`
