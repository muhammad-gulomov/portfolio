import type { TelegramApi } from './api'
import type { TgMessage, TgUser } from './commands'

export type MessageEntity = {
  type: string
  offset: number
  length: number
  user?: TgUser
}

let cachedBot: { id: number; username?: string } | null = null

export async function getBotIdentity(api: TelegramApi): Promise<{ id: number; username?: string }> {
  if (cachedBot) return cachedBot
  const me = await api.getMe()
  cachedBot = { id: me.id, username: me.username }
  return cachedBot
}

/** Reset cache (tests). */
export function clearBotIdentityCache(): void {
  cachedBot = null
}

export function userHandle(user: TgUser): string {
  if (user.username) return `@${user.username}`
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ')
  return name || String(user.id)
}

export function greetText(user: TgUser): string {
  return `wassup nigga, ${userHandle(user)}`
}

export function messageMentionsBot(
  message: TgMessage & { entities?: MessageEntity[] },
  bot: { id: number; username?: string },
): boolean {
  const text = message.text ?? ''
  const entities = message.entities ?? []

  for (const ent of entities) {
    if (ent.type === 'mention' && bot.username) {
      const slice = text.slice(ent.offset, ent.offset + ent.length)
      if (slice.toLowerCase() === `@${bot.username.toLowerCase()}`) return true
    }
    if (ent.type === 'text_mention' && ent.user?.id === bot.id) return true
  }

  // Fallback if entities missing but plain @bot appears
  if (bot.username) {
    const re = new RegExp(`(^|\\s)@${bot.username}\\b`, 'i')
    if (re.test(text)) return true
  }

  return false
}

export async function handleMentionGreeting(
  api: TelegramApi,
  message: TgMessage & { entities?: MessageEntity[] },
): Promise<boolean> {
  if (!message.from || !message.text) return false
  // Don't greet on slash commands
  if (message.text.trimStart().startsWith('/')) return false

  const bot = await getBotIdentity(api)
  if (!messageMentionsBot(message, bot)) return false

  await api.sendMessage(message.chat.id, greetText(message.from))
  return true
}
