const fs = require('node:fs');
const path = require('node:path');
const nodemailer = require('nodemailer');
const { dailySuggestion } = require('../lib/market');
const { composeDailyEmail } = require('../lib/email');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const args = { preview: false, exchange: 'NSE', limit: 40 };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--preview') args.preview = true;
    if (token === '--exchange') args.exchange = argv[i + 1] || 'NSE';
    if (token === '--limit') args.limit = Number(argv[i + 1] || 40);
  }
  return args;
}

function mailConfig() {
  return {
    to: process.env.EMAIL_TO || 'dvkr22@gmail.com',
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'dvkr22@gmail.com',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  };
}

async function buildPayload({ exchange, limit }) {
  const [intraday, longterm] = await Promise.all([
    dailySuggestion({ horizon: 'intraday', exchange, limit }),
    dailySuggestion({ horizon: 'longterm', exchange, limit }),
  ]);
  return { intraday, longterm };
}

async function sendDailyEmail({ preview = false, exchange = 'NSE', limit = 40 } = {}) {
  const mail = mailConfig();
  const payload = await buildPayload({ exchange, limit });
  const message = composeDailyEmail({
    ...payload,
    to: mail.to,
  });

  if (preview) {
    return { preview: true, to: mail.to, ...message, payload };
  }

  if (!mail.user || !mail.pass) {
    const error = new Error(
      'Set SMTP_USER and SMTP_PASS (Gmail app password) to send. Use --preview to print without sending.'
    );
    error.preview = message;
    throw error;
  }

  const transporter = nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    secure: mail.port === 465,
    auth: { user: mail.user, pass: mail.pass },
  });

  const info = await transporter.sendMail({
    from: mail.from,
    to: mail.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  return { preview: false, to: mail.to, messageId: info.messageId, subject: message.subject };
}

async function main() {
  loadEnvFile(path.join(__dirname, '..', '.env'));
  const args = parseArgs(process.argv.slice(2));
  try {
    const result = await sendDailyEmail(args);
    if (result.preview) {
      process.stdout.write(`${result.subject}\n\n${result.text}\n`);
      return;
    }
    process.stdout.write(`Sent to ${result.to}: ${result.subject}\n`);
  } catch (error) {
    if (error.preview) {
      process.stderr.write(`${error.message}\n`);
      process.stdout.write(`${error.preview.subject}\n\n${error.preview.text}\n`);
      process.exitCode = 2;
      return;
    }
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  loadEnvFile,
  parseArgs,
  mailConfig,
  sendDailyEmail,
  buildPayload,
};
