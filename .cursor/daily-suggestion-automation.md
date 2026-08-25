# Cursor notification: daily NSE suggestion

Paste this as a **Cursor Automation** (Cloud Agent, scheduled) if you want the pick in Cursor even after this chat ends.

- **When:** cron `45 2 * * 1-5` (08:15 IST weekdays; India has no DST)
- **Repo:** this repository
- **Model:** same as usual
- **Prompt:**

```
Post today's NSE/BSE daily suggestion in this Cursor chat. Do not send email.

In the repo run:
npm run notify:cursor

Reply with the markdown the command prints (intraday buy window + sell by 15:10 IST, and the long-term sell-by date). If the command fails, use lib/market.js dailySuggestion for intraday and longterm and format the same way.

This is a notification for Divakar. Keep it to the suggestion only. Not investment advice.
```
