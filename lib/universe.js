const NSE_CORE = [
  ['RELIANCE', 'Reliance Industries'],
  ['TCS', 'Tata Consultancy Services'],
  ['HDFCBANK', 'HDFC Bank'],
  ['BHARTIARTL', 'Bharti Airtel'],
  ['ICICIBANK', 'ICICI Bank'],
  ['INFY', 'Infosys'],
  ['SBIN', 'State Bank of India'],
  ['LICI', 'LIC of India'],
  ['ITC', 'ITC'],
  ['HINDUNILVR', 'Hindustan Unilever'],
  ['LT', 'Larsen & Toubro'],
  ['BAJFINANCE', 'Bajaj Finance'],
  ['HCLTECH', 'HCL Technologies'],
  ['MARUTI', 'Maruti Suzuki'],
  ['SUNPHARMA', 'Sun Pharma'],
  ['AXISBANK', 'Axis Bank'],
  ['KOTAKBANK', 'Kotak Mahindra Bank'],
  ['TITAN', 'Titan Company'],
  ['ULTRACEMCO', 'UltraTech Cement'],
  ['NTPC', 'NTPC'],
  ['ONGC', 'ONGC'],
  ['POWERGRID', 'Power Grid'],
  ['ADANIENT', 'Adani Enterprises'],
  ['ADANIPORTS', 'Adani Ports'],
  ['TATAMOTORS', 'Tata Motors'],
  ['TATASTEEL', 'Tata Steel'],
  ['JSWSTEEL', 'JSW Steel'],
  ['WIPRO', 'Wipro'],
  ['ASIANPAINT', 'Asian Paints'],
  ['NESTLEIND', 'Nestle India'],
  ['COALINDIA', 'Coal India'],
  ['BAJAJFINSV', 'Bajaj Finserv'],
  ['M&M', 'Mahindra & Mahindra'],
  ['TECHM', 'Tech Mahindra'],
  ['HINDALCO', 'Hindalco'],
  ['GRASIM', 'Grasim Industries'],
  ['CIPLA', 'Cipla'],
  ['DRREDDY', 'Dr Reddy\'s Labs'],
  ['APOLLOHOSP', 'Apollo Hospitals'],
  ['EICHERMOT', 'Eicher Motors'],
  ['HEROMOTOCO', 'Hero MotoCorp'],
  ['BAJAJ-AUTO', 'Bajaj Auto'],
  ['INDUSINDBK', 'IndusInd Bank'],
  ['TATACONSUM', 'Tata Consumer'],
  ['BPCL', 'Bharat Petroleum'],
  ['BRITANNIA', 'Britannia'],
  ['DIVISLAB', 'Divi\'s Labs'],
  ['SHRIRAMFIN', 'Shriram Finance'],
  ['TRENT', 'Trent'],
  ['BEL', 'Bharat Electronics'],
  ['HAL', 'Hindustan Aeronautics'],
  ['DMART', 'Avenue Supermarts'],
  ['PIDILITIND', 'Pidilite'],
  ['GODREJCP', 'Godrej Consumer'],
  ['DABUR', 'Dabur'],
  ['HAVELLS', 'Havells'],
  ['SIEMENS', 'Siemens'],
  ['ABB', 'ABB India'],
  ['DLF', 'DLF'],
  ['LODHA', 'Macrotech Developers'],
  ['IRFC', 'IRFC'],
  ['PFC', 'Power Finance Corp'],
  ['RECLTD', 'REC'],
  ['BANKBARODA', 'Bank of Baroda'],
  ['PNB', 'Punjab National Bank'],
  ['CANBK', 'Canara Bank'],
  ['UNIONBANK', 'Union Bank'],
  ['IOC', 'Indian Oil'],
  ['GAIL', 'GAIL'],
  ['VEDL', 'Vedanta'],
  ['HINDZINC', 'Hindustan Zinc'],
  ['NMDC', 'NMDC'],
  ['SAIL', 'SAIL'],
  ['JINDALSTEL', 'Jindal Steel'],
  ['ADANIGREEN', 'Adani Green'],
  ['ADANIENSOL', 'Adani Energy Solutions'],
  ['ATGL', 'Adani Total Gas'],
  ['AMBUJACEM', 'Ambuja Cements'],
  ['SHREECEM', 'Shree Cement'],
  ['ACC', 'ACC'],
  ['INDIGO', 'InterGlobe Aviation'],
  ['ZOMATO', 'Eternal / Zomato'],
  ['PAYTM', 'Paytm'],
  ['NYKAA', 'Nykaa'],
  ['POLICYBZR', 'PB Fintech'],
  ['NAUKRI', 'Info Edge'],
  ['IRCTC', 'IRCTC'],
  ['CONCOR', 'Container Corp'],
  ['TVSMOTOR', 'TVS Motor'],
  ['BOSCHLTD', 'Bosch'],
  ['MOTHERSON', 'Samvardhana Motherson'],
  ['ASHOKLEY', 'Ashok Leyland'],
  ['TIINDIA', 'Tube Investments'],
  ['POLYCAB', 'Polycab'],
  ['CGPOWER', 'CG Power'],
  ['CUMMINSIND', 'Cummins India'],
  ['VOLTAS', 'Voltas'],
  ['BLUESTARCO', 'Blue Star'],
  ['BERGEPAINT', 'Berger Paints'],
  ['COLPAL', 'Colgate-Palmolive'],
  ['MARICO', 'Marico'],
  ['TATAPOWER', 'Tata Power'],
  ['JSWENERGY', 'JSW Energy'],
  ['NHPC', 'NHPC'],
  ['SJVN', 'SJVN'],
  ['TORNTPHARM', 'Torrent Pharma'],
  ['LUPIN', 'Lupin'],
  ['AUROPHARMA', 'Aurobindo Pharma'],
  ['BIOCON', 'Biocon'],
  ['ALKEM', 'Alkem Labs'],
  ['MAXHEALTH', 'Max Healthcare'],
  ['FORTIS', 'Fortis Healthcare'],
  ['SBILIFE', 'SBI Life'],
  ['HDFCLIFE', 'HDFC Life'],
  ['ICICIPRULI', 'ICICI Prudential Life'],
  ['ICICIGI', 'ICICI Lombard'],
  ['SBICARD', 'SBI Cards'],
  ['BAJAJHLDNG', 'Bajaj Holdings'],
  ['CHOLAFIN', 'Cholamandalam'],
  ['MUTHOOTFIN', 'Muthoot Finance'],
  ['PFC', 'Power Finance Corporation'],
];

const BSE_ONLY = [
  ['500325', 'Reliance Industries (BSE code)'],
];

function uniqueBySymbol(rows) {
  const seen = new Set();
  const out = [];
  for (const [symbol, name] of rows) {
    if (seen.has(symbol)) continue;
    seen.add(symbol);
    out.push({ symbol, name });
  }
  return out;
}

const NSE_EQUITIES = uniqueBySymbol(NSE_CORE);

function instrumentsForScan({ exchange = 'ALL' } = {}) {
  const nse = NSE_EQUITIES.map((row) => ({
    ...row,
    exchange: 'NSE',
    kiteKey: `NSE:${row.symbol}`,
    yahooSymbol: `${row.symbol}.NS`,
  }));
  const bse = NSE_EQUITIES.map((row) => ({
    ...row,
    exchange: 'BSE',
    kiteKey: `BSE:${row.symbol}`,
    yahooSymbol: `${row.symbol}.BO`,
  }));

  if (exchange === 'NSE') return nse;
  if (exchange === 'BSE') return bse;
  return [...nse, ...bse];
}

function findInstrument(query) {
  const raw = String(query || '').trim().toUpperCase();
  if (!raw) return null;
  const [maybeExchange, maybeSymbol] = raw.includes(':') ? raw.split(':') : [null, raw];
  const symbol = (maybeSymbol || raw).replace(/\.NS$|\.BO$/, '');
  const exchange = maybeExchange === 'BSE' || raw.endsWith('.BO') ? 'BSE' : 'NSE';
  const universe = instrumentsForScan({ exchange });
  return universe.find((row) => row.symbol === symbol) || {
    symbol,
    name: symbol,
    exchange,
    kiteKey: `${exchange}:${symbol}`,
    yahooSymbol: `${symbol}.${exchange === 'BSE' ? 'BO' : 'NS'}`,
  };
}

module.exports = {
  NSE_EQUITIES,
  BSE_ONLY,
  instrumentsForScan,
  findInstrument,
};
