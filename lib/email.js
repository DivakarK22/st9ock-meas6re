function rupee(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function rangeText(range) {
  if (!range) return '—';
  return `${rupee(range.low)} – ${rupee(range.high)}`;
}

function windowText(timing) {
  if (!timing?.buyWindow) return 'No cash-buy window today';
  return `${timing.buyWindow.start}–${timing.buyWindow.end} ${timing.buyWindow.timezone || 'IST'}`;
}

function pickBlock(title, suggestion) {
  const pick = suggestion.pick;
  const session = suggestion.session
    ? `${suggestion.session.weekday} ${suggestion.session.date} · ${suggestion.session.open}–${suggestion.session.close} IST`
    : '';
  if (!pick) {
    return [
      title,
      session,
      suggestion.headline,
      '',
    ].join('\n');
  }
  const watch = (suggestion.watch || [])
    .map(
      (row) =>
        `- ${row.exchange}:${row.symbol} · ${row.action} · buy ${windowText(row.timing)} · sell by ${row.timing?.sellBy || '—'}`
    )
    .join('\n');
  return [
    title,
    session,
    suggestion.headline,
    `${pick.action} — ${pick.reason}`,
    `Buy range: ${rangeText(pick.buyRange)}`,
    `Sell range: ${rangeText(pick.sellRange)}`,
    `Buy window: ${windowText(pick.timing)}`,
    `Sell by: ${pick.timing?.sellBy || '—'}`,
    `Stop: ${rupee(pick.stopLoss)}`,
    `Targets: ${(pick.targets || []).map(rupee).join(' · ')}`,
    pick.timing?.note || '',
    pick.research?.summary ? `Outlook: ${pick.research.outlook} · ${pick.research.summary}` : '',
    pick.research?.annualReports?.reports?.[0]
      ? `Annual report: ${pick.research.annualReports.reports[0].period} ${pick.research.annualReports.reports[0].url}`
      : '',
    (pick.research?.articles || [])
      .slice(0, 4)
      .map((a) => `News: ${a.title}`)
      .join('\n'),
    watch ? `Also watch:\n${watch}` : '',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

function pickHtml(title, suggestion) {
  const pick = suggestion.pick;
  const session = suggestion.session
    ? `${suggestion.session.weekday} ${suggestion.session.date} · ${suggestion.session.open}–${suggestion.session.close} IST`
    : '';
  if (!pick) {
    return `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(suggestion.headline)}</p><p>${escapeHtml(session)}</p>`;
  }
  const watch = (suggestion.watch || [])
    .map(
      (row) =>
        `<li><strong>${escapeHtml(row.exchange)}:${escapeHtml(row.symbol)}</strong> — ${escapeHtml(row.action)}<br/>Buy ${escapeHtml(windowText(row.timing))} · Sell by ${escapeHtml(row.timing?.sellBy || '—')}</li>`
    )
    .join('');
  return `
    <h2 style="margin-bottom:4px">${escapeHtml(title)}</h2>
    <p style="color:#556">${escapeHtml(session)}</p>
    <p><strong>${escapeHtml(suggestion.headline)}</strong></p>
    <p>${escapeHtml(pick.action)} — ${escapeHtml(pick.reason)}</p>
    <table cellpadding="8" cellspacing="0" style="border-collapse:collapse">
      <tr><td>Buy range</td><td><strong>${escapeHtml(rangeText(pick.buyRange))}</strong></td></tr>
      <tr><td>Sell range</td><td><strong>${escapeHtml(rangeText(pick.sellRange))}</strong></td></tr>
      <tr><td>Buy window (IST)</td><td><strong>${escapeHtml(windowText(pick.timing))}</strong></td></tr>
      <tr style="background:#fff3f3"><td>Time to sell</td><td><strong>${escapeHtml(pick.timing?.sellBy || '—')}</strong></td></tr>
      <tr><td>Stop</td><td>${escapeHtml(rupee(pick.stopLoss))}</td></tr>
      <tr><td>Targets</td><td>${escapeHtml((pick.targets || []).map(rupee).join(' · '))}</td></tr>
    </table>
    <p>${escapeHtml(pick.timing?.note || '')}</p>
    ${
      pick.research
        ? `<p><strong>Company outlook (${escapeHtml(pick.research.outlook)})</strong> — ${escapeHtml(pick.research.summary)}</p>
           <ul>${(pick.research.articles || [])
             .slice(0, 5)
             .map((a) => `<li>${escapeHtml(a.title)}</li>`)
             .join('')}</ul>
           ${
             pick.research.annualReports?.reports?.[0]
               ? `<p><a href="${escapeHtml(pick.research.annualReports.reports[0].url)}">${escapeHtml(pick.research.annualReports.reports[0].period)} annual report (PDF)</a></p>`
               : ''
           }`
        : ''
    }
    ${watch ? `<h3>Also watch</h3><ul>${watch}</ul>` : ''}
  `;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function composeDailyEmail({ intraday, longterm, to }) {
  const sessionDate = intraday?.session?.date || longterm?.session?.date || 'today';
  const headline = intraday?.pick
    ? `Buy ${intraday.pick.exchange}:${intraday.pick.symbol} today · sell by ${intraday.pick.timing?.sellBy || '15:10 IST'}`
    : `Daily suggestion ${sessionDate}`;
  const subject = `NSE daily suggestion · ${sessionDate} · ${headline}`;
  const text = [
    'Bharat Market Analyst — daily suggestion',
    'Educational technicals, not investment advice. Confirm on Kite before trading.',
    '',
    pickBlock('INTRADAY', intraday),
    pickBlock('LONG TERM', longterm),
  ].join('\n');
  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:640px;color:#102027">
      <p style="letter-spacing:.12em;text-transform:uppercase;color:#b8860b;font-size:12px">Bharat Market Analyst</p>
      <h1 style="margin-top:0">Daily suggestion for ${escapeHtml(sessionDate)}</h1>
      <p>Educational ranges only. Confirm on Zerodha Kite before you trade.</p>
      ${pickHtml('Intraday (sell by 15:10 IST)', intraday)}
      ${pickHtml('Long term', longterm)}
      <p style="color:#778">Sent to ${escapeHtml(to)}. No website required — this is the scheduled CLI email.</p>
    </div>
  `;
  return { subject, text, html, headline };
}

function composeDailyMarkdown({ intraday, longterm }) {
  const sessionDate = intraday?.session?.date || longterm?.session?.date || 'today';
  const headline = intraday?.pick
    ? `Buy **${intraday.pick.exchange}:${intraday.pick.symbol}** today · sell by **${intraday.pick.timing?.sellBy || '15:10 IST'}**`
    : `Daily suggestion ${sessionDate}`;
  const markdown = [
    `## Daily NSE suggestion · ${sessionDate}`,
    '',
    headline,
    '',
    '_Headlines and a company profile are folded in. This is not a forecast of future returns._',
    '',
    '```',
    pickBlock('INTRADAY', intraday),
    pickBlock('LONG TERM', longterm),
    '```',
    '',
    'Delivered in Cursor (no email).',
  ].join('\n');
  return { title: `Daily NSE suggestion · ${sessionDate}`, headline, markdown };
}

module.exports = {
  rupee,
  rangeText,
  windowText,
  composeDailyEmail,
  composeDailyMarkdown,
  escapeHtml,
};
