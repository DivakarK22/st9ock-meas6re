const {
  parseRss,
  isNoiseTitle,
  scoreHeadline,
  themesFromTitle,
  summarizeResearch,
  demoArticles,
} = require('../research');

const TIMEOUT_MS = 8000;

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BharatMarketAnalyst/1.0 (research; +https://github.com)',
        Accept: 'application/rss+xml, application/json, text/xml',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url) {
  const text = await fetchText(url);
  return JSON.parse(text);
}

function newsSearchUrls(instrument) {
  const name = instrument.name || instrument.symbol;
  const symbol = instrument.symbol;
  const queries = [
    `"${name}" ${symbol} (results OR earnings OR order OR contract OR SEBI OR merger OR dividend OR AI)`,
    `${name} ${symbol} NSE stock India`,
  ];
  return queries.map(
    (q) =>
      `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`
  );
}

function mapArticles(items) {
  const seen = new Set();
  const articles = [];
  for (const item of items) {
    if (isNoiseTitle(item.title)) continue;
    const key = item.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const sentiment = scoreHeadline(item.title);
    articles.push({
      ...item,
      sentiment,
      themes: themesFromTitle(item.title),
    });
    if (articles.length >= 12) break;
  }
  return articles;
}

async function fetchGoogleNews(instrument) {
  const batches = await Promise.all(
    newsSearchUrls(instrument).map(async (url) => {
      try {
        const xml = await fetchText(url);
        return parseRss(xml);
      } catch {
        return [];
      }
    })
  );
  return mapArticles(batches.flat());
}

async function fetchWikipediaProfile(instrument) {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
      instrument.name || instrument.symbol
    )}&limit=1&namespace=0&format=json`;
    const search = await fetchJson(searchUrl);
    const title = search?.[1]?.[0];
    if (!title) return null;
    const page = await fetchJson(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    return {
      title: page.title,
      description: page.description,
      extract: page.extract,
      url: page.content_urls?.desktop?.page,
    };
  } catch {
    return null;
  }
}

function newsMode() {
  if (process.env.NEWS_PROVIDER === 'off') return 'off';
  if (process.env.NEWS_PROVIDER === 'demo') return 'demo';
  return 'live';
}

async function researchCompany(instrument) {
  const mode = newsMode();
  if (mode === 'off') {
    return {
      source: 'off',
      profile: null,
      articles: [],
      outlook: 'unknown',
      score: 0,
      themes: [],
      summary: 'Company news lookup is turned off.',
    };
  }

  if (mode === 'demo') {
    const articles = demoArticles(instrument);
    const score = articles.reduce((sum, a) => sum + a.sentiment, 0);
    const packed = summarizeResearch({
      profile: `${instrument.name} is in the liquid NSE/BSE universe used by this analyser.`,
      articles,
      score,
    });
    return { source: 'demo', profile: { extract: packed.summary }, articles, ...packed };
  }

  const [articles, profile] = await Promise.all([
    fetchGoogleNews(instrument),
    fetchWikipediaProfile(instrument),
  ]);
  const score = articles.reduce((sum, a) => sum + (a.sentiment || 0), 0);
  const packed = summarizeResearch({
    profile: profile?.extract,
    articles,
    score,
  });
  return {
    source: articles.length || profile ? 'google-news+wikipedia' : 'none',
    profile,
    articles,
    ...packed,
  };
}

function combinedView(technicalAction, outlook) {
  const isBuy = /BUY|ACCUMULATE/i.test(technicalAction || '') && !/AVOID/i.test(technicalAction || '');
  if (outlook === 'defensive' && isBuy) return 'conflicted';
  if (outlook === 'constructive' && isBuy) return 'aligned-long';
  if (outlook === 'defensive') return 'defensive';
  if (outlook === 'constructive') return 'news-supportive';
  return 'mixed';
}

module.exports = {
  fetchGoogleNews,
  fetchWikipediaProfile,
  researchCompany,
  combinedView,
  newsMode,
};
