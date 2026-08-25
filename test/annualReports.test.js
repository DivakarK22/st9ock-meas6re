const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseAnnualReportsPayload,
  parseScreenerHighlights,
  annualReportBlurb,
} = require('../lib/providers/annualReports');

describe('annual reports', () => {
  it('maps NSE annual-report filings to PDF links', () => {
    const reports = parseAnnualReportsPayload({
      data: [
        {
          companyName: 'Infosys Limited',
          fromYr: '2025',
          toYr: '2026',
          submission_type: 'Revised',
          broadcast_dttm: '30-MAY-2026 20:04:13',
          fileName:
            'https://nsearchives.nseindia.com/annual_reports/AR_INFY_2025_2026.pdf',
          attFileSize: '8.57 MB',
        },
      ],
    });
    assert.equal(reports[0].period, 'FY 2025-26');
    assert.match(reports[0].url, /nsearchives\.nseindia\.com/);
  });

  it('reads Screener growth and ROE tables', () => {
    const html = `
      <div class="pros"><ul><li>3 Years ROE 30.8%</li></ul></div>
      <div class="cons"><ul><li>Promoter holding is low</li></ul></div>
      <table><tr><th colspan="2">Compounded Sales Growth</th></tr>
      <tr><td>5 Years:</td><td>12%</td></tr>
      <tr><td>TTM:</td><td>11%</td></tr></table>
      <table><tr><th colspan="2">Compounded Profit Growth</th></tr>
      <tr><td>5 Years:</td><td>9%</td></tr></table>
      <table><tr><th colspan="2">Return on Equity</th></tr>
      <tr><td>5 Years:</td><td>31%</td></tr></table>
    `;
    const hi = parseScreenerHighlights(html);
    assert.equal(hi.salesGrowth.TTM, '11%');
    assert.equal(hi.roe['5 Years'], '31%');
    assert.match(hi.pros[0], /ROE/);
  });

  it('builds a blurb from the latest filing', () => {
    const text = annualReportBlurb({
      reports: [{ period: 'FY 2025-26', submissionType: 'Revised' }],
      highlights: { roe: { '3 Years': '30.8%' }, pros: ['Healthy ROE'] },
    });
    assert.match(text, /FY 2025-26/);
    assert.match(text, /30\.8%/);
  });
});
