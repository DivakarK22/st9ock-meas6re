const providerEl = document.getElementById('provider');
const form = document.getElementById('analyze-form');
const detail = document.getElementById('detail');
const scanBtn = document.getElementById('scan-btn');
const dailyBtn = document.getElementById('daily-btn');
const scanBody = document.getElementById('scan-body');
const scanMeta = document.getElementById('scan-meta');
const dailyMeta = document.getElementById('daily-meta');
const dailyBody = document.getElementById('daily-body');

function rupee(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function rangeText(range) {
  if (!range) return '—';
  return `${rupee(range.low)} – ${rupee(range.high)}`;
}

function windowText(timing) {
  if (!timing?.buyWindow) return '—';
  return `${timing.buyWindow.start}–${timing.buyWindow.end} ${timing.buyWindow.timezone}`;
}

async function loadProvider() {
  const res = await fetch('/api/health');
  const data = await res.json();
  providerEl.textContent = data.provider?.note || data.service;
}

function renderDetail(payload) {
  const a = payload.analysis;
  const inst = payload.instrument;
  const timing = payload.timing;
  detail.classList.remove('hidden');
  detail.innerHTML = `
    <p class="meta">${inst.exchange}:${inst.symbol} · ${inst.name} · ${payload.source} · ${a.horizon}</p>
    <h2>${inst.symbol} · ${rupee(a.lastPrice)} <span class="meta">(${a.changePct}%)</span></h2>
    <p><strong>${a.action}</strong> — ${a.reason}. Bias ${a.bias}, confidence ${a.confidence}.
      View <strong>${payload.investmentView || 'mixed'}</strong>.</p>
    <div class="cards">
      <article class="card buy"><span>Buy range</span><strong>${rangeText(a.buyRange)}</strong></article>
      <article class="card sell"><span>Sell range</span><strong>${rangeText(a.sellRange)}</strong></article>
      <article class="card buy"><span>Buy window</span><strong>${windowText(timing)}</strong></article>
      <article class="card sell"><span>Sell by</span><strong>${timing?.sellBy || '—'}</strong></article>
    </div>
    <p class="meta">${timing?.note || ''} Stop ${rupee(a.stopLoss)} · Targets ${a.targets.map(rupee).join(' · ')}</p>
    <p class="meta">
      RSI ${a.indicators.rsi ?? '—'} · ATR ${a.indicators.atr ?? '—'} ·
      SMA20 ${a.indicators.sma20 ?? '—'} · SMA50 ${a.indicators.sma50 ?? '—'} ·
      SMA200 ${a.indicators.sma200 ?? '—'} · 52w ${rupee(a.indicators.low52)}–${rupee(a.indicators.high52)}
    </p>
    ${renderResearch(payload.research)}
  `;
}

function renderResearch(research) {
  if (!research) return '';
  const items = (research.articles || [])
    .slice(0, 8)
    .map(
      (a) =>
        `<li><a href="${a.url}" target="_blank" rel="noreferrer">${a.title}</a>
         <div class="meta">${a.source || ''} · ${a.publishedAt || ''} · ${a.themes?.join(', ') || ''}</div></li>`
    )
    .join('');
  const profile = research.profile?.extract
    ? `<p>${research.profile.extract}</p>`
    : '';
  return `
    <div class="research">
      <h3>Company news &amp; profile</h3>
      <p><strong>Outlook: ${research.outlook}</strong> — ${research.summary}</p>
      ${profile}
      <ul class="news-list">${items || '<li>No recent headlines.</li>'}</ul>
      <p class="meta">Sources: Google News RSS and Wikipedia. Not a prediction of future price.</p>
    </div>
  `;
}

function renderScan(payload) {
  scanMeta.textContent = `Scanned ${payload.scanned} ${payload.exchange} names (${payload.horizon}). ${payload.succeeded} analysed.`;
  if (!payload.ideas.length) {
    scanBody.innerHTML = '<tr><td colspan="11">No ideas returned.</td></tr>';
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
          <td>${row.buyWindow || '—'}</td>
          <td>${row.timing?.sellBy || '—'}</td>
          <td>${rupee(row.stopLoss)}</td>
          <td>${row.rsi ?? '—'}</td>
        </tr>`
    )
    .join('');
}

function renderDaily(payload) {
  const session = payload.session
    ? `${payload.session.weekday} ${payload.session.date} · ${payload.session.open}–${payload.session.close} IST`
    : '';
  dailyMeta.textContent = `${payload.headline}. ${session} · ${payload.buyCandidates} buy setups from ${payload.scanned} names.`;
  const pick = payload.pick;
  if (!pick) {
    dailyBody.innerHTML = `<p>No cash-buy candidate for this session. Scan the table for wait/sell ideas.</p>`;
    return;
  }
  const watch = (payload.watch || [])
    .map(
      (row) => `
        <li data-symbol="${row.exchange}:${row.symbol}">
          <strong>${row.symbol}</strong> · ${row.action}
          <div class="meta">Buy ${windowText(row.timing)} · Sell by ${row.timing?.sellBy || '—'}</div>
        </li>`
    )
    .join('');
  dailyBody.innerHTML = `
    <div class="daily-pick">
      <article class="daily-hero" data-symbol="${pick.exchange}:${pick.symbol}">
        <p class="meta">${pick.exchange}:${pick.symbol} · score ${pick.score}</p>
        <h3>Buy ${pick.symbol} today</h3>
        <p>${pick.reason}</p>
        <p><strong>Buy ${rangeText(pick.buyRange)}</strong> between <strong>${windowText(pick.timing)}</strong></p>
        <p class="sell"><strong>Sell by ${pick.timing?.sellBy}</strong> into ${rangeText(pick.sellRange)}</p>
        <p class="meta">${pick.timing?.note || ''}</p>
        <p class="meta"><strong>News outlook: ${pick.research?.outlook || 'n/a'}</strong> — ${(pick.research?.summary || '').slice(0, 280)}</p>
      </article>
      <article class="card buy"><span>Buy window (IST)</span><strong>${windowText(pick.timing)}</strong><p class="meta">Cash / MIS entry</p></article>
      <article class="card sell"><span>Time to sell</span><strong>${pick.timing?.sellBy}</strong><p class="meta">${pick.timing?.hold || ''}</p></article>
    </div>
    ${watch ? `<h3>Also watch</h3><ul class="watch-list">${watch}</ul>` : ''}
  `;
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

async function loadDaily() {
  const horizon = form.horizon.value;
  const exchange = form.exchange.value;
  dailyMeta.textContent = 'Picking today’s buy and sell-by time…';
  const res = await fetch(
    `/api/daily-suggestion?horizon=${horizon}&exchange=${exchange}&limit=40`
  );
  const data = await res.json();
  if (!res.ok) {
    dailyMeta.textContent = data.error || 'Daily suggestion failed';
    return;
  }
  renderDaily(data);
}

dailyBtn.addEventListener('click', () => {
  loadDaily();
});

function selectSymbol(symbol) {
  form.symbol.value = symbol;
  form.requestSubmit();
}

scanBody.addEventListener('click', (event) => {
  const row = event.target.closest('tr[data-symbol]');
  if (!row) return;
  selectSymbol(row.dataset.symbol);
});

dailyBody.addEventListener('click', (event) => {
  const row = event.target.closest('[data-symbol]');
  if (!row) return;
  selectSymbol(row.dataset.symbol);
});

loadProvider()
  .then(loadDaily)
  .catch(() => {
    providerEl.textContent = 'Server unreachable';
  });
