# Stock Measure

A minimal stock position measurement demo for Cloud Agent development.

## Development

```bash
npm ci
npm start
```

Open http://localhost:3000 to use the web UI, or call the API directly:

```bash
curl -X POST http://localhost:3000/api/measure \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"AAPL","quantity":10}'
```

## Tests

```bash
npm test
```
