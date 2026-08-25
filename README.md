# Bharat Market Analyst

Scan liquid **NSE** and **BSE** stocks, then get suggested **buy range**, **sell range**, stop, and targets for **intraday** or **long-term** horizons.

This is a technical-analysis helper, not investment advice.

## What it does

- Analyses a symbol (example: `NSE:RELIANCE` or `BSE:TCS`).
- Scans a universe of liquid Indian equities and ranks setups.
- Uses pivots + ATR for intraday zones, and 52-week / Fibonacci / moving-average structure for longer-term zones.
- Each idea also includes an IST **buy window** and a **sell-by time** (15:10 IST for intraday MIS; a review date for longer-term holds).
- **Today's suggestion** ranks cash-buy setups and names one stock to buy today, plus when to sell.
- **Company research:** Google News (India) plus a Wikipedia profile. Headlines adjust the view (including WAIT / NEWS RISK). This is **not** a prediction of future returns.
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

Preview the Cursor notification text:

```bash
npm run notify:cursor
```

## Daily notification in Cursor

Default delivery is **this Cursor chat**, not email.

- A weekday timer at **08:15 IST** (`45 2 * * 1-5` UTC) wakes the agent and posts the buy window + sell-by time here.
- For a notification that outlives this conversation, create a Cursor Automation using `.cursor/daily-suggestion-automation.md`.

Email remains available with `npm run email:daily` if you still want SMTP.

## Daily email (optional)

The CLI builds today’s buy pick and emails it. Default recipient is `dvkr22@gmail.com`.

1. Copy `.env.example` to `.env`.
2. Create a [Gmail app password](https://myaccount.google.com/apppasswords) and set `SMTP_USER` / `SMTP_PASS`.
3. Preview without sending:

```bash
npm run email:preview
```

4. Send once:

```bash
npm run email:daily
```

5. Schedule weekdays at **08:15 IST** on this computer:

```bash
npm run email:install-cron
```

The laptop/PC must be on at that time. If you would rather not keep a machine running, add repo secrets (`EMAIL_TO`, `SMTP_USER`, `SMTP_PASS`, and optionally Kite keys) and the workflow `.github/workflows/daily-suggestion-email.yml` sends the same mail from GitHub Actions. That is not a hosted site — it is only a scheduled job.

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
- `GET /api/daily-suggestion?exchange=NSE|BSE|ALL&horizon=intraday|longterm&limit=40`
- `GET /api/research?symbol=NSE:INFY`
- `GET /api/scan?exchange=NSE|BSE|ALL&horizon=intraday|longterm&limit=40`
