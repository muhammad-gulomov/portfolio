import type { TelegramApi } from './api'
import * as db from './db'
import { dateInGmtPlus5 } from './time'

export type TgUser = {
  id: number
  first_name?: string
  last_name?: string
  username?: string
}

export type TgMessage = {
  message_id: number
  chat: { id: number; type: string }
  from?: TgUser
  text?: string
  entities?: { type: string; offset: number; length: number; user?: TgUser }[]
  reply_to_message?: { from?: TgUser }
}

function displayName(user: TgUser): string {
  const parts = [user.first_name, user.last_name].filter(Boolean)
  return parts.join(' ') || user.username || String(user.id)
}

function parseCommand(text: string): { cmd: string; args: string } | null {
  const m = text.trim().match(/^\/([a-zA-Z_]+)(?:@[\w_]+)?(?:\s+([\s\S]*))?$/)
  if (!m) return null
  return { cmd: m[1].toLowerCase(), args: (m[2] ?? '').trim() }
}

export function parseAdminIds(raw: string | undefined): Set<number> {
  if (!raw) return new Set()
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n)),
  )
}

export async function handleCommand(
  database: D1Database,
  api: TelegramApi,
  message: TgMessage,
  adminIds: Set<number>,
): Promise<void> {
  const text = message.text
  if (!text || !message.from) return
  const parsed = parseCommand(text)
  if (!parsed) return

  const chatId = message.chat.id
  const from = message.from
  const isAdmin = adminIds.has(from.id)

  const reply = (body: string) => api.sendMessage(chatId, body)

  if (!isAdmin && ['bind', 'add', 'remove', 'list', 'who'].includes(parsed.cmd)) {
    // Silently ignore non-admins for unknown noise; soft reply for known admin cmds.
    await reply('Admin only.')
    return
  }

  switch (parsed.cmd) {
    case 'bind': {
      if (message.chat.type !== 'group' && message.chat.type !== 'supergroup') {
        await reply('Run /bind inside the cleaning group.')
        return
      }
      await db.bindGroup(database, chatId, new Date().toISOString())
      await reply('Group bound. Use /add (reply to someone) to build the rotation.')
      return
    }
    case 'add': {
      const group = await db.getGroup(database)
      if (!group) {
        await reply('Bind the group first with /bind.')
        return
      }
      if (group.chat_id !== chatId) {
        await reply('This chat is not the bound cleaning group.')
        return
      }

      let target: TgUser | null = message.reply_to_message?.from ?? null
      let nameOverride: string | null = null
      if (!target && parsed.args) {
        const parts = parsed.args.split(/\s+/)
        const id = Number(parts[0])
        if (!Number.isFinite(id)) {
          await reply('Usage: reply with /add, or /add <telegram_user_id> [name]')
          return
        }
        target = { id, first_name: parts.slice(1).join(' ') || String(id) }
        if (parts.length > 1) nameOverride = parts.slice(1).join(' ')
      }
      if (!target) {
        await reply('Usage: reply to a member with /add, or /add <telegram_user_id> [name]')
        return
      }
      const member = await db.addMember(
        database,
        target.id,
        nameOverride || displayName(target),
        target.username ?? null,
      )
      await reply(`Added ${db.mention(member)} to the rotation.`)
      return
    }
    case 'remove': {
      const group = await db.getGroup(database)
      if (!group || group.chat_id !== chatId) {
        await reply('This chat is not the bound cleaning group.')
        return
      }
      let userId: number | null = message.reply_to_message?.from?.id ?? null
      if (userId == null && parsed.args) {
        const id = Number(parsed.args.split(/\s+/)[0])
        if (Number.isFinite(id)) userId = id
      }
      if (userId == null) {
        await reply('Usage: reply with /remove, or /remove <telegram_user_id>')
        return
      }
      const ok = await db.deactivateMember(database, userId)
      await reply(ok ? 'Removed from the rotation.' : 'That user is not in the rotation.')
      return
    }
    case 'list': {
      const members = await db.listActiveMembers(database)
      if (members.length === 0) {
        await reply('Rotation is empty.')
        return
      }
      const group = await db.getGroup(database)
      const lines = members.map((m, i) => {
        const marker = group?.current_member_id === m.telegram_user_id ? ' ← current' : ''
        return `${i + 1}. ${db.mention(m)}${marker}`
      })
      await reply(`Cleaning rotation:\n${lines.join('\n')}`)
      return
    }
    case 'who': {
      const group = await db.getGroup(database)
      if (!group) {
        await reply('No group bound yet.')
        return
      }
      const today = dateInGmtPlus5()
      const day = await db.getDayByDate(database, today)
      const dutyId = day?.duty_user_id ?? group.current_member_id
      if (dutyId == null) {
        await reply('No one is on duty yet. /add members first.')
        return
      }
      const duty = await db.getMemberByTelegramId(database, dutyId)
      const label = duty ? db.mention(duty) : `user ${dutyId}`
      const status = day ? ` (${day.status})` : ''
      await reply(`Today's turn: ${label}${status}`)
      return
    }
    default:
      return
  }
}
