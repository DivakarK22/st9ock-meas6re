const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseRss,
  scoreHeadline,
  summarizeResearch,
  isNoiseTitle,
} = require('../lib/research');
const { combinedView } = require('../lib/providers/news');

const SAMPLE_RSS = `<?xml version="1.0"?><rss><channel>
<item><title>Infosys wins large AI contract from European client - Moneycontrol</title>
<link>https://example.com/1</link><pubDate>Tue, 25 Aug 2026 10:00:00 GMT</pubDate>
<source>Moneycontrol</source></item>
<item><title>SEBI probe into unnamed broker - Ignore</title>
<link>https://example.com/2</link></item>
<item><title>INFY Share Price Today - Infosys Ltd. Stock Price Live NSE/BSE - Univest</title>
<link>https://example.com/3</link></item>
</channel></rss>`;

describe('company research', () => {
  it('parses Google News RSS items', () => {
    const items = parseRss(SAMPLE_RSS);
    assert.equal(items[0].title.includes('AI contract'), true);
    assert.equal(items[0].source, 'Moneycontrol');
  });

  it('scores headlines and drops live-price noise', () => {
    assert.ok(scoreHeadline('Infosys wins large order') > 0);
    assert.ok(scoreHeadline('SEBI probe and penalty for the company') < 0);
    assert.equal(isNoiseTitle('INFY Share Price Today - Live NSE/BSE'), true);
  });

  it('builds a non-forecast outlook summary', () => {
    const packed = summarizeResearch({
      profile: 'Infosys is an Indian IT company.',
      articles: [
        { title: 'Infosys wins contract', themes: ['orders'] },
        { title: 'Broker upgrade', themes: ['earnings'] },
      ],
      score: 3,
    });
    assert.equal(packed.outlook, 'constructive');
    assert.match(packed.summary, /supportive/i);
    assert.doesNotMatch(packed.summary, /Recent headlines/);
  });

  it('flags conflicted technicals versus defensive news', () => {
    assert.equal(combinedView('BUY DIP', 'defensive'), 'conflicted');
    assert.equal(combinedView('BUY DIP', 'constructive'), 'aligned-long');
  });
});
