const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const TIMEOUT_MS = 12000;
let nseCookie = '';
let nseCookieAt = 0;

async function fetchResponse(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: 'application/json, text/html, */*',
        ...headers,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function cookieHeaderFromResponse(response) {
  const pairs = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  return pairs
    .map((entry) => String(entry).split(';')[0])
    .filter(Boolean)
    .join('; ');
}

async function refreshNseCookie() {
  if (nseCookie && Date.now() - nseCookieAt < 8 * 60 * 1000) return nseCookie;
  const home = await fetchResponse('https://www.nseindia.com/');
  const fromHome = cookieHeaderFromResponse(home);
  const quote = await fetchResponse('https://www.nseindia.com/get-quotes/equity?symbol=INFY', {
    Cookie: fromHome,
  });
  nseCookie = [fromHome, cookieHeaderFromResponse(quote)].filter(Boolean).join('; ');
  nseCookieAt = Date.now();
  return nseCookie;
}

function mapAnnualReport(row) {
  const fromYear = String(row.fromYr || row.fromYear || '');
  const toYear = String(row.toYr || row.toYear || '');
  return {
    companyName: row.companyName,
    fromYear,
    toYear,
    period: fromYear && toYear ? `FY ${fromYear}-${toYear.slice(-2)}` : 'Annual report',
    submissionType: row.submission_type || row.submissionType || 'New',
    publishedAt: row.broadcast_dttm || row.disseminationDateTime || '',
    url: row.fileName || row.file_name || '',
    size: row.attFileSize || null,
    source: 'NSE',
  };
}

function parseAnnualReportsPayload(payload) {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const reports = [];
  const seen = new Set();
  for (const row of rows) {
    const mapped = mapAnnualReport(row);
    if (!mapped.url) continue;
    const key = `${mapped.period}|${mapped.submissionType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    reports.push(mapped);
    if (reports.length >= 6) break;
  }
  return reports;
}

async function fetchNseAnnualReports(symbol) {
  const cookie = await refreshNseCookie();
  const url = `https://www.nseindia.com/api/annual-reports?index=equities&symbol=${encodeURIComponent(symbol)}`;
  const response = await fetchResponse(url, {
    Cookie: cookie,
    Referer: `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`,
  });
  if (!response.ok) throw new Error(`NSE annual reports HTTP ${response.status}`);
  return parseAnnualReportsPayload(await response.json());
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function listItems(html, className) {
  const block = html.match(new RegExp(`class="${className}"[\\s\\S]*?<ul>([\\s\\S]*?)</ul>`));
  if (!block) return [];
  return [...block[1].matchAll(/<li>([\s\S]*?)<\/li>/g)]
    .map((m) => decodeHtml(m[1].replace(/<[^>]+>/g, ' ')))
    .filter(Boolean)
    .slice(0, 4);
}

function tablePairs(html, heading) {
  const block = html.match(
    new RegExp(`<th[^>]*>\\s*${heading}\\s*</th>[\\s\\S]*?</table>`, 'i')
  );
  if (!block) return {};
  const pairs = {};
  for (const row of block[0].matchAll(/<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>/g)) {
    pairs[decodeHtml(row[1]).replace(/:$/, '')] = decodeHtml(row[2]);
  }
  return pairs;
}

function parseScreenerHighlights(html) {
  return {
    source: 'screener.in',
    url: null,
    pros: listItems(html, 'pros'),
    cons: listItems(html, 'cons'),
    salesGrowth: tablePairs(html, 'Compounded Sales Growth'),
    profitGrowth: tablePairs(html, 'Compounded Profit Growth'),
    roe: tablePairs(html, 'Return on Equity'),
  };
}

async function fetchScreenerHighlights(symbol) {
  const response = await fetchResponse(
    `https://www.screener.in/company/${encodeURIComponent(symbol)}/consolidated/`
  );
  if (!response.ok) throw new Error(`Screener HTTP ${response.status}`);
  const highlights = parseScreenerHighlights(await response.text());
  highlights.url = `https://www.screener.in/company/${encodeURIComponent(symbol)}/consolidated/`;
  return highlights;
}

function demoAnnualReports(instrument) {
  const year = new Date().getFullYear();
  return {
    reports: [
      {
        companyName: instrument.name,
        fromYear: String(year - 1),
        toYear: String(year),
        period: `FY ${year - 1}-${String(year).slice(-2)}`,
        submissionType: 'Demo',
        publishedAt: new Date().toUTCString(),
        url: `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(instrument.symbol)}`,
        size: null,
        source: 'demo',
      },
    ],
    highlights: {
      source: 'demo',
      url: null,
      pros: [`${instrument.name} demo: multi-year ROE remains healthy in the sample set.`],
      cons: ['Demo data only — connect live mode for NSE annual-report PDFs.'],
      salesGrowth: { TTM: 'n/a' },
      profitGrowth: { TTM: 'n/a' },
      roe: { '3 Years': 'n/a' },
    },
  };
}

async function fetchAnnualReportPack(instrument) {
  if (process.env.NEWS_PROVIDER === 'demo' || process.env.NEWS_PROVIDER === 'off') {
    return demoAnnualReports(instrument);
  }
  const symbol = instrument.symbol;
  const [reportsResult, highlightsResult] = await Promise.allSettled([
    fetchNseAnnualReports(symbol),
    fetchScreenerHighlights(symbol),
  ]);
  return {
    reports: reportsResult.status === 'fulfilled' ? reportsResult.value : [],
    reportsError: reportsResult.status === 'rejected' ? reportsResult.reason.message : null,
    highlights: highlightsResult.status === 'fulfilled' ? highlightsResult.value : null,
    highlightsError:
      highlightsResult.status === 'rejected' ? highlightsResult.reason.message : null,
  };
}

function annualReportBlurb(pack) {
  const latest = pack.reports?.[0];
  const roe = pack.highlights?.roe?.['3 Years'] || pack.highlights?.roe?.['5 Years'];
  const parts = [];
  if (latest) parts.push(`Latest annual report ${latest.period} (${latest.submissionType}) is on NSE.`);
  if (roe) parts.push(`3y/5y ROE snapshot ${roe}.`);
  if (pack.highlights?.pros?.[0]) parts.push(pack.highlights.pros[0]);
  return parts.join(' ');
}

module.exports = {
  parseAnnualReportsPayload,
  parseScreenerHighlights,
  fetchAnnualReportPack,
  annualReportBlurb,
  demoAnnualReports,
  mapAnnualReport,
};
