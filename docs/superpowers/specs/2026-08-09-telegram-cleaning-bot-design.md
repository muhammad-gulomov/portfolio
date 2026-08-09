# Telegram cleaning-turn bot (on kanzen Worker)

**Date:** 2026-08-09  
**Status:** Approved design  
**Host:** same Cloudflare Worker as `kanzen.uz` (Hono + D1)

## Goal

A small group bot that rotates who takes out the trash, reminds the group in the morning, and confirms completion with a 3-OK vote in the evening — without a second backend.

## Product rules

| Rule | Value |
|------|--------|
| Timezone | GMT+5 (`Asia/Tashkent`) |
| Morning | 08:00 — finalize yesterday if needed, announce today’s duty |
| Evening | 20:00 — post vote with one **OK** button |
| Pass | ≥ 3 distinct OK votes |
| Self-vote | Forbidden |
| Voters | Active rotation members who are still in the bound group |
| Forwards | Ignored (callback must match bound `chat_id` + stored vote `message_id`) |
| Language | English only |
| Membership | Admin `/add` / `/remove` (not auto-from-group) |

## Architecture

- `POST /telegram/webhook` — Telegram updates (commands + callback queries)
- Cloudflare cron: `0 3 * * *` (08:00 GMT+5), `0 15 * * *` (20:00 GMT+5)
- Shared D1 tables: `cleaning_group`, `cleaning_members`, `cleaning_days`, `cleaning_votes`
- Secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ADMIN_IDS`

Webhook path skips HTML Layout / locale / owner middleware. Worker export is `{ fetch, scheduled }`.

## Commands (admin only)

- `/bind` — bind this group chat (run once in the target group)
- `/add` — reply to a user, or `/add <telegram_user_id> [name]`
- `/remove` — reply or `/remove <telegram_user_id>`
- `/list` — show rotation
- `/who` — show today’s duty

## Day lifecycle

1. Morning creates (or reuses) `cleaning_days` for today with `duty_user_id = current_member`.
2. If yesterday was still `pending`/`voting`, mark `failed` and keep the same duty.
3. Evening posts the OK keyboard; status → `voting`.
4. On 3rd valid OK → `passed`, advance `current_member` to next active member by `sort_order`.
5. Next morning uses the (possibly advanced) pointer.

## Security

- Verify `X-Telegram-Bot-Api-Secret-Token` against `TELEGRAM_WEBHOOK_SECRET`.
- Never store bot tokens in git; use `wrangler secret put`.
- Admin commands allowed only for user ids in `TELEGRAM_ADMIN_IDS`.

## Out of scope

Portfolio UI, multi-group support, i18n, auto-import of all Telegram members.

## Ops setup (after deploy)

1. Revoke any token that was pasted into chat; create a fresh one in BotFather.
2. `npx wrangler secret put TELEGRAM_BOT_TOKEN`
3. `npx wrangler secret put TELEGRAM_WEBHOOK_SECRET` (long random string)
4. `npx wrangler secret put TELEGRAM_ADMIN_IDS` (your numeric Telegram user id)
5. Set webhook:

```bash
curl -s "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://kanzen.uz/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

6. Add the bot to the group as admin (enough to read members / send messages).
7. In the group, run `/bind`, then `/add` for each person in rotation order.
