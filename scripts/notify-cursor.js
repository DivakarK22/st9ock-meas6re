const { dailySuggestion } = require('../lib/market');
const { composeDailyMarkdown } = require('../lib/email');

async function buildCursorNotification({ exchange = 'NSE', limit = 40 } = {}) {
  const [intraday, longterm] = await Promise.all([
    dailySuggestion({ horizon: 'intraday', exchange, limit }),
    dailySuggestion({ horizon: 'longterm', exchange, limit }),
  ]);
  return composeDailyMarkdown({ intraday, longterm });
}

async function main() {
  const notice = await buildCursorNotification({
    exchange: process.env.EXCHANGE || 'NSE',
    limit: Number(process.env.SCAN_LIMIT || 40),
  });
  process.stdout.write(`${notice.markdown}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { buildCursorNotification };
