# Cleaning bot — deploy & Telegram setup

Complete these steps after the Worker code is deployed.

## 1. Secrets

**Revoke** any bot token that was shared in chat (BotFather → API Token → Revoke), then:

```bash
cd ~/Desktop/Library/java/kanzen
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET   # long random string
npx wrangler secret put TELEGRAM_ADMIN_IDS        # your numeric Telegram user id
```

Find your user id via [@userinfobot](https://t.me/userinfobot) or similar.

Local `.dev.vars` (gitignored) may include the same keys for `wrangler dev`.

## 2. D1 migration

```bash
npx wrangler d1 migrations apply kanzen-db --remote
```

## 3. Webhook

```bash
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://kanzen.uz/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

Confirm: `curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"`

## 4. Group

1. Add the bot to the group (can send messages; `getChatMember` must work).
2. As an admin listed in `TELEGRAM_ADMIN_IDS`, run `/bind`.
3. `/add` each person in rotation order (reply to their message, or `/add <user_id> Name`).
4. `/list` and `/who` to verify.

## Schedule

| Local (GMT+5) | Cron (UTC) | Action |
|---------------|------------|--------|
| 08:00 | `0 3 * * *` | Finalize yesterday + announce duty |
| 20:00 | `0 15 * * *` | Post OK vote |

## Commands

| Command | Who | Effect |
|---------|-----|--------|
| `/bind` | admin | Bind this group |
| `/add` | admin | Add member to rotation |
| `/remove` | admin | Remove member |
| `/list` | admin | Show rotation |
| `/who` | admin | Today's duty |
