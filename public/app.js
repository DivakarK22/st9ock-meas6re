const providerEl = document.getElementById('provider');
const form = document.getElementById('analyze-form');
const detail = document.getElementById('detail');
const scanBtn = document.getElementById('scan-btn');
const scanBody = document.getElementById('scan-body');
const scanMeta = document.getElementById('scan-meta');

function rupee(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function rangeText(range) {
  if (!range) return '—';
  return `${rupee(range.low)} – ${rupee(range.high)}`;
}

async function loadProvider() {
  const res = await fetch('/api/health');
  const data = await res.json();
  providerEl.textContent = data.provider?.note || data.service;
}

function renderDetail(payload) {
  const a = payload.analysis;
  const inst = payload.instrument;
  detail.classList.remove('hidden');
  detail.innerHTML = `
    <p class="meta">${inst.exchange}:${inst.symbol} · ${inst.name} · ${payload.source} · ${a.horizon}</p>
    <h2>${inst.symbol} · ${rupee(a.lastPrice)} <span class="meta">(${a.changePct}%)</span></h2>
    <p><strong>${a.action}</strong> — ${a.reason}. Bias ${a.bias}, confidence ${a.confidence}.</p>
    <div class="cards">
      <article class="card buy"><span>Buy range</span><strong>${rangeText(a.buyRange)}</strong></article>
      <article class="card sell"><span>Sell range</span><strong>${rangeText(a.sellRange)}</strong></article>
      <article class="card"><span>Stop</span><strong>${rupee(a.stopLoss)}</strong></article>
      <article class="card"><span>Targets</span><strong>${a.targets.map(rupee).join(' · ')}</strong></article>
    </div>
    <p class="meta">
      RSI ${a.indicators.rsi ?? '—'} · ATR ${a.indicators.atr ?? '—'} ·
      SMA20 ${a.indicators.sma20 ?? '—'} · SMA50 ${a.indicators.sma50 ?? '—'} ·
      SMA200 ${a.indicators.sma200 ?? '—'} · 52w ${rupee(a.indicators.low52)}–${rupee(a.indicators.high52)}
    </p>
    <p class="meta">
      Pivots P ${rupee(a.pivots.pivot)} · S1 ${rupee(a.pivots.s1)} · R1 ${rupee(a.pivots.r1)}
    </p>
  `;
}

function renderScan(payload) {
  scanMeta.textContent = `Scanned ${payload.scanned} ${payload.exchange} names (${payload.horizon}). ${payload.succeeded} analysed.`;
  if (!payload.ideas.length) {
    scanBody.innerHTML = '<tr><td colspan="9">No ideas returned.</td></tr>';
    return;
  }
  scanBody.innerHTML = payload.ideas
    .map(
      (row) => `
        <tr data-symbol="${row.exchange}:${row.symbol}">
          <td>${row.score}</td>
          <td>${row.symbol}<div class="meta">${row.exchange} · ${row.name}</div></td>
          <td>${rupee(row.lastPrice)} <div class="meta">${row.changePct}%</div></td>
          <td>${row.bias}</td>
          <td>${row.action}</td>
          <td>${rangeText(row.buyRange)}</td>
          <td>${rangeText(row.sellRange)}</td>
          <td>${rupee(row.stopLoss)}</td>
          <td>${row.rsi ?? '—'}</td>
        </tr>`
    )
    .join('');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const symbol = form.symbol.value;
  const horizon = form.horizon.value;
  providerEl.textContent = `Analysing ${symbol}…`;
  const res = await fetch(`/api/analyze?symbol=${encodeURIComponent(symbol)}&horizon=${horizon}`);
  const data = await res.json();
  if (!res.ok) {
    providerEl.textContent = data.error || 'Analyse failed';
    return;
  }
  renderDetail(data);
  providerEl.textContent = `Source: ${data.source}`;
});

scanBtn.addEventListener('click', async () => {
  const horizon = form.horizon.value;
  const exchange = form.exchange.value;
  scanMeta.textContent = 'Scanning liquid names…';
  const res = await fetch(`/api/scan?horizon=${horizon}&exchange=${exchange}&limit=40`);
  const data = await res.json();
  if (!res.ok) {
    scanMeta.textContent = data.error || 'Scan failed';
    return;
  }
  renderScan(data);
});

scanBody.addEventListener('click', (event) => {
  const row = event.target.closest('tr[data-symbol]');
  if (!row) return;
  form.symbol.value = row.dataset.symbol;
  form.requestSubmit();
});

loadProvider().catch(() => {
  providerEl.textContent = 'Server unreachable';
});
