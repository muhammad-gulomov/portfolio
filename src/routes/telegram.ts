import { Hono } from 'hono'
import type { Env } from '../types'
import { createTelegramApi } from '../telegram/api'
import { handleCommand, parseAdminIds, type TgMessage } from '../telegram/commands'
import { handleMentionGreeting } from '../telegram/greet'
import { handleOkVote } from '../telegram/logic'

const telegramRoutes = new Hono<{ Bindings: Env }>()

type Update = {
  update_id?: number
  message?: TgMessage
  callback_query?: {
    id: string
    from: { id: number }
    message?: { message_id: number; chat: { id: number } }
    data?: string
  }
}

telegramRoutes.post('/telegram/webhook', async (c) => {
  const secret = c.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret || !c.env.TELEGRAM_BOT_TOKEN) {
    return c.text('not configured', 503)
  }

  const header = c.req.header('X-Telegram-Bot-Api-Secret-Token')
  if (header !== secret) {
    return c.text('unauthorized', 401)
  }

  let update: Update
  try {
    update = await c.req.json<Update>()
  } catch {
    return c.text('bad request', 400)
  }

  const api = createTelegramApi(c.env.TELEGRAM_BOT_TOKEN)
  const adminIds = parseAdminIds(c.env.TELEGRAM_ADMIN_IDS)

  try {
    if (update.callback_query) {
      const cq = update.callback_query
      const data = cq.data ?? ''
      const m = data.match(/^clean_ok:(\d+)$/)
      if (!m || !cq.message) {
        await api.answerCallbackQuery(cq.id, 'Ignored.')
        return c.json({ ok: true })
      }
      await handleOkVote(c.env.DB, api, {
        chatId: cq.message.chat.id,
        messageId: cq.message.message_id,
        voterUserId: cq.from.id,
        dayId: Number(m[1]),
        callbackQueryId: cq.id,
      })
      return c.json({ ok: true })
    }

    if (update.message?.text) {
      const greeted = await handleMentionGreeting(api, update.message)
      if (!greeted) {
        await handleCommand(c.env.DB, api, update.message, adminIds)
      }
    }
  } catch (err) {
    console.error('telegram webhook error', err)
  }

  return c.json({ ok: true })
})

export default telegramRoutes
