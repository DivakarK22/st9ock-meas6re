const IST = 'Asia/Kolkata';

function istParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    weekday: get('weekday'),
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  };
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDate({ year, month, day }) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function weekdayIndex(weekday) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
}

function addDays(parts, days) {
  const utc = Date.UTC(parts.year, parts.month - 1, parts.day + days, 6, 0, 0);
  return istParts(new Date(utc));
}

function nextTradingSession(date = new Date()) {
  let parts = istParts(date);
  const minutes = parts.hour * 60 + parts.minute;
  const afterClose = minutes >= 15 * 60 + 30;
  let skip = afterClose ? 1 : 0;
  let session = skip ? addDays(parts, 1) : parts;
  while (['Sat', 'Sun'].includes(session.weekday)) {
    session = addDays(session, 1);
  }
  return {
    date: formatDate(session),
    weekday: session.weekday,
    timezone: 'IST',
    open: '09:15',
    close: '15:30',
    squareOff: '15:10',
  };
}

function addCalendarDays(isoDate, days) {
  const [year, month, day] = isoDate.split('-').map(Number);
  let parts = { year, month, day, weekday: 'Mon' };
  parts = addDays(parts, days);
  while (['Sat', 'Sun'].includes(parts.weekday)) {
    parts = addDays(parts, 1);
  }
  return formatDate(parts);
}

function isBuyAction(action) {
  const text = String(action || '');
  if (/AVOID|REDUCE/i.test(text)) return false;
  return /BUY|ACCUMULATE/i.test(text);
}

function suggestTiming(analysis, date = new Date()) {
  const session = nextTradingSession(date);
  const buyAction = isBuyAction(analysis.action);

  if (analysis.horizon === 'intraday') {
    if (buyAction) {
      const openDrive = analysis.bias === 'uptrend' && (analysis.indicators?.rsi ?? 50) >= 48;
      const buyWindow = openDrive
        ? { start: '09:20', end: '09:50', timezone: 'IST' }
        : { start: '09:45', end: '10:45', timezone: 'IST' };
      return {
        session,
        side: 'buy',
        buyWindow,
        sellWindow: { start: '14:15', end: '15:10', timezone: 'IST' },
        sellBy: '15:10 IST',
        sellByLabel: `Sell by 15:10 IST on ${session.date}`,
        hold: 'same session',
        note: openDrive
          ? 'Buy in the opening drive if price holds the buy range. Book T1/T2 or exit by 15:10 IST before typical MIS square-off.'
          : 'Buy the morning dip inside the buy range. Trail toward the sell range and flatten by 15:10 IST.',
      };
    }
    return {
      session,
      side: 'sell',
      buyWindow: null,
      sellWindow: { start: '09:45', end: '11:00', timezone: 'IST' },
      sellBy: '15:10 IST',
      sellByLabel: `Cover / square-off by 15:10 IST on ${session.date}`,
      hold: 'same session',
      note: 'Not a cash-buy today. If trading the short side, fade the rally early and cover by 15:10 IST.',
    };
  }

  const rsi = analysis.indicators?.rsi;
  const holdDays = rsi != null && rsi <= 40 ? 12 : analysis.bias === 'uptrend' ? 25 : 18;
  const sellDate = addCalendarDays(session.date, holdDays);
  return {
    session,
    side: buyAction ? 'buy' : 'wait',
    buyWindow: { start: '09:20', end: '15:00', timezone: 'IST' },
    sellWindow: null,
    sellBy: sellDate,
    sellByLabel: `Review / sell by ${sellDate} (or if price reaches the sell range)`,
    hold: `${holdDays} trading days`,
    note: buyAction
      ? `Accumulate in the buy range during the ${session.date} cash session. Plan to sell into the sell range, or review by ${sellDate}.`
      : `No fresh long today. Revisit on ${session.date}; time any exit toward the sell range by ${sellDate}.`,
  };
}

function windowText(window) {
  if (!window) return null;
  return `${window.start}–${window.end} ${window.timezone || 'IST'}`;
}

module.exports = {
  IST,
  istParts,
  nextTradingSession,
  suggestTiming,
  isBuyAction,
  windowText,
  addCalendarDays,
};
