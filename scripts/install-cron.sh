#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NPM_BIN="$(command -v npm)"
LOG_DIR="${HOME}/.bharat-market-analyst"
mkdir -p "$LOG_DIR"

# 08:15 IST Mon–Fri = 02:45 UTC (India has no DST). The Node script loads ROOT/.env.
CRON_LINE="45 2 * * 1-5 cd ${ROOT} && ${NPM_BIN} run email:daily >> ${LOG_DIR}/cron.log 2>&1"

EXISTING="$(crontab -l 2>/dev/null || true)"
FILTERED="$(printf '%s\n' "$EXISTING" | grep -v 'email:daily' || true)"
{
  printf '%s\n' "$FILTERED"
  printf '%s\n' "$CRON_LINE"
} | crontab -

echo "Installed weekday cron (08:15 IST / 02:45 UTC):"
echo "  $CRON_LINE"
echo "Put SMTP_USER, SMTP_PASS, and EMAIL_TO in ${ROOT}/.env"
echo "Preview: ${NPM_BIN} run email:preview"
echo "This machine must be on at 08:15 IST, or use the GitHub Action instead."
