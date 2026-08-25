const POSITIVE = [
  'wins',
  'won',
  'order',
  'contract',
  'profit',
  'growth',
  'upgrade',
  'expansion',
  'record',
  'dividend',
  'buyback',
  'partnership',
  'approval',
  'beats',
  'surge',
  'raises',
  'outperform',
];

const NEGATIVE = [
  'fraud',
  'probe',
  'sebi',
  'loss',
  'losses',
  'downgrade',
  'ban',
  'default',
  'layoff',
  'layoffs',
  'investigation',
  'raid',
  'penalty',
  'fine',
  'delay',
  'misses',
  'missed',
  'caution',
  'cautious',
  'underperform',
  'scam',
  'litigation',
];

function decodeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block, name) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

function parseRss(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = re.exec(xml))) {
    const block = match[1];
    const title = tag(block, 'title');
    if (!title) continue;
    items.push({
      title,
      url: tag(block, 'link'),
      publishedAt: tag(block, 'pubDate'),
      source: tag(block, 'source'),
    });
  }
  return items;
}

function isNoiseTitle(title) {
  return /share price today|live nse\/bse|stock price live/i.test(title);
}

function scoreHeadline(title) {
  const text = title.toLowerCase();
  let score = 0;
  for (const word of POSITIVE) {
    if (text.includes(word)) score += 1;
  }
  for (const word of NEGATIVE) {
    if (text.includes(word)) score -= 1;
  }
  return score;
}

function themesFromTitle(title) {
  const text = title.toLowerCase();
  const themes = [];
  if (/result|earning|profit|revenue|q[1-4]/i.test(text)) themes.push('earnings');
  if (/order|contract|deal|partnership/i.test(text)) themes.push('orders');
  if (/sebi|probe|raid|ban|penalty|litigation/i.test(text)) themes.push('regulation');
  if (/merger|acquire|acquisition|stake/i.test(text)) themes.push('m&a');
  if (/ai |artificial intelligence|product|launch/i.test(text)) themes.push('product');
  if (/dividend|buyback/i.test(text)) themes.push('capital return');
  return themes;
}

function outlookFromScore(score, count) {
  if (count === 0) return 'unknown';
  if (score >= 2) return 'constructive';
  if (score <= -2) return 'defensive';
  return 'mixed';
}

function summarizeResearch({ profile, articles, score }) {
  const outlook = outlookFromScore(score, articles.length);
  const themes = [...new Set(articles.flatMap((a) => a.themes || []))];
  const top = articles.slice(0, 3).map((a) => a.title);
  const newsLine = top.length
    ? `Recent headlines: ${top.join(' | ')}`
    : 'No usable recent headlines were retrieved.';
  const themeLine = themes.length ? `Themes: ${themes.join(', ')}.` : '';
  const futureLine =
    outlook === 'constructive'
      ? 'News flow currently leans supportive of holding or accumulating, if technicals agree.'
      : outlook === 'defensive'
        ? 'News flow currently leans negative; treat fresh longs as higher risk until headlines clear.'
        : 'News flow is mixed or thin; do not treat it as a forecast of future returns.';
  return {
    outlook,
    score,
    themes,
    summary: [profile, themeLine, futureLine].filter(Boolean).join(' '),
    headlineDigest: newsLine,
  };
}

function demoArticles(instrument) {
  const name = instrument.name || instrument.symbol;
  return [
    {
      title: `${name} reviews expansion and order pipeline — demo headline`,
      url: 'https://news.google.com',
      publishedAt: new Date().toUTCString(),
      source: 'demo',
      themes: ['orders'],
      sentiment: 1,
    },
    {
      title: `Street stays mixed on ${name} after broker notes — demo headline`,
      url: 'https://news.google.com',
      publishedAt: new Date().toUTCString(),
      source: 'demo',
      themes: ['earnings'],
      sentiment: 0,
    },
  ];
}

module.exports = {
  decodeXml,
  parseRss,
  isNoiseTitle,
  scoreHeadline,
  themesFromTitle,
  outlookFromScore,
  summarizeResearch,
  demoArticles,
};
