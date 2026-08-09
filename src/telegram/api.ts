export type InlineKeyboard = { inline_keyboard: { text: string; callback_data: string }[][] }

export type ChatMemberStatus =
  | 'creator'
  | 'administrator'
  | 'member'
  | 'restricted'
  | 'left'
  | 'kicked'

export type TelegramApi = {
  sendMessage(
    chatId: number,
    text: string,
    opts?: { reply_markup?: InlineKeyboard; parse_mode?: string },
  ): Promise<{ message_id: number }>
  editMessageText(
    chatId: number,
    messageId: number,
    text: string,
    opts?: { reply_markup?: InlineKeyboard },
  ): Promise<void>
  answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void>
  getChatMember(chatId: number, userId: number): Promise<{ status: ChatMemberStatus }>
}

export function createTelegramApi(token: string, fetchFn: typeof fetch = fetch): TelegramApi {
  const base = `https://api.telegram.org/bot${token}`

  async function call<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetchFn(`${base}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await res.json()) as { ok: boolean; description?: string; result?: T }
    if (!data.ok || data.result === undefined) {
      throw new Error(`Telegram ${method} failed: ${data.description ?? res.status}`)
    }
    return data.result
  }

  return {
    sendMessage(chatId, text, opts) {
      return call('sendMessage', {
        chat_id: chatId,
        text,
        ...(opts?.parse_mode ? { parse_mode: opts.parse_mode } : {}),
        ...(opts?.reply_markup ? { reply_markup: opts.reply_markup } : {}),
      })
    },
    async editMessageText(chatId, messageId, text, opts) {
      await call('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        ...(opts?.reply_markup ? { reply_markup: opts.reply_markup } : {}),
      })
    },
    async answerCallbackQuery(callbackQueryId, text) {
      await call('answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        ...(text ? { text } : {}),
      })
    },
    getChatMember(chatId, userId) {
      return call('getChatMember', { chat_id: chatId, user_id: userId })
    },
  }
}

export function isActiveChatMember(status: ChatMemberStatus): boolean {
  return status === 'creator' || status === 'administrator' || status === 'member' || status === 'restricted'
}
