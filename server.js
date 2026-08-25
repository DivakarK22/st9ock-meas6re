const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory measurements for demo purposes
const measurements = [];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'stock-measure' });
});

app.get('/api/measurements', (_req, res) => {
  res.json({ measurements });
});

app.post('/api/measure', (req, res) => {
  const symbol = String(req.body?.symbol ?? '').trim().toUpperCase();
  const quantity = Number(req.body?.quantity);

  if (!symbol || !Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({
      error: 'symbol (non-empty string) and quantity (positive number) are required',
    });
  }

  const pricePerShare = 100 + (symbol.charCodeAt(0) % 50);
  const totalValue = pricePerShare * quantity;

  const measurement = {
    id: measurements.length + 1,
    symbol,
    quantity,
    pricePerShare,
    totalValue,
    measuredAt: new Date().toISOString(),
  };

  measurements.push(measurement);
  res.status(201).json({ measurement });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Stock Measure server listening on http://0.0.0.0:${PORT}`);
});
