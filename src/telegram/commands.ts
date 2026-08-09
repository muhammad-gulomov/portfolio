import type { TelegramApi } from './api'
import * as db from './db'
import { dateInGmtPlus5, nextDateGmtPlus5 } from './time'

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

/** Remember speakers so later /add @username can resolve. */
export async function rememberMessageUsers(database: D1Database, message: TgMessage): Promise<void> {
  if (message.from) await db.rememberUser(database, message.from)
  if (message.reply_to_message?.from) await db.rememberUser(database, message.reply_to_message.from)
  for (const ent of message.entities ?? []) {
    if (ent.type === 'text_mention' && ent.user) await db.rememberUser(database, ent.user)
  }
}

async function resolveUsername(
  database: D1Database,
  api: TelegramApi,
  username: string,
): Promise<TgUser | null> {
  const clean = username.replace(/^@/, '')
  const known = await db.findKnownByUsername(database, clean)
  if (known) {
    return {
      id: known.telegram_user_id,
      username: known.username ?? clean,
      first_name: known.display_name,
    }
  }
  try {
    const chat = await api.getChat(`@${clean}`)
    if (chat.type === 'private' || chat.first_name) {
      const user: TgUser = {
        id: chat.id,
        username: chat.username ?? clean,
        first_name: chat.first_name ?? clean,
        last_name: chat.last_name,
      }
      await db.rememberUser(database, user)
      return user
    }
  } catch {
    // getChat often fails for users the bot has never seen
  }
  return null
}

export type ResolvedTarget = { user: TgUser; label: string }

/** Parse reply + @mentions + numeric ids from an /add or /remove message. */
export async function resolveTargets(
  database: D1Database,
  api: TelegramApi,
  message: TgMessage,
  args: string,
): Promise<{ targets: ResolvedTarget[]; unresolved: string[] }> {
  const targets: ResolvedTarget[] = []
  const unresolved: string[] = []
  const seen = new Set<number>()

  const push = (user: TgUser) => {
    if (seen.has(user.id)) return
    seen.add(user.id)
    targets.push({ user, label: user.username ? `@${user.username}` : displayName(user) })
  }

  if (message.reply_to_message?.from) push(message.reply_to_message.from)

  for (const ent of message.entities ?? []) {
    if (ent.type === 'text_mention' && ent.user) push(ent.user)
  }

  const tokens = args.split(/\s+/).filter(Boolean)
  for (const token of tokens) {
    if (token.startsWith('@')) {
      const user = await resolveUsername(database, api, token)
      if (user) push(user)
      else unresolved.push(token)
      continue
    }
    const id = Number(token)
    if (Number.isFinite(id) && String(id) === token) {
      push({ id, first_name: String(id) })
      continue
    }
    // bare username without @
    if (/^[A-Za-z]\w{4,31}$/.test(token)) {
      const user = await resolveUsername(database, api, token)
      if (user) push(user)
      else unresolved.push(`@${token}`)
    }
  }

  return { targets, unresolved }
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

  if (!isAdmin && ['bind', 'add', 'remove'].includes(parsed.cmd)) {
    await reply('Admin only.')
    return
  }

  switch (parsed.cmd) {
    case 'bind': {
      if (message.chat.type !== 'group' && message.chat.type !== 'supergroup') {
        await reply('Run /bind inside the cleaning group.')
        return
      }
      const startsOn = nextDateGmtPlus5(dateInGmtPlus5())
      await db.bindGroup(database, chatId, new Date().toISOString(), startsOn)
      await reply(
        `Group bound. Rotation starts ${startsOn} (GMT+5).\n` +
          'Add people by replying to their message with /add.',
      )
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

      const { targets, unresolved } = await resolveTargets(database, api, message, parsed.args)
      if (targets.length === 0) {
        await reply(
          'Usage:\n' +
            '• Reply to someone with /add\n' +
            '• Or /add @user / numeric id (works after the bot has seen them)',
        )
        return
      }

      const added: string[] = []
      for (const t of targets) {
        const member = await db.addMember(
          database,
          t.user.id,
          displayName(t.user),
          t.user.username ?? null,
        )
        added.push(db.mention(member))
      }

      let body = `Added: ${added.join(', ')}`
      if (unresolved.length) {
        body +=
          `\nCould not resolve: ${unresolved.join(', ')}.\n` +
          'Reply to one of their messages with /add.'
      }
      await reply(body)
      return
    }
    case 'remove': {
      const group = await db.getGroup(database)
      if (!group || group.chat_id !== chatId) {
        await reply('This chat is not the bound cleaning group.')
        return
      }
      const { targets, unresolved } = await resolveTargets(database, api, message, parsed.args)
      if (targets.length === 0) {
        await reply('Usage: /remove @user, or reply with /remove.')
        return
      }
      const results: string[] = []
      for (const t of targets) {
        const ok = await db.deactivateMember(database, t.user.id)
        results.push(ok ? `removed ${t.label}` : `${t.label} not in rotation`)
      }
      let body = results.join('\n')
      if (unresolved.length) body += `\nCould not resolve: ${unresolved.join(', ')}`
      await reply(body)
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
      if (group.starts_on && today < group.starts_on) {
        const dutyId = group.current_member_id
        const duty = dutyId != null ? await db.getMemberByTelegramId(database, dutyId) : null
        const label = duty ? db.mention(duty) : 'not set yet'
        await reply(`Rotation starts ${group.starts_on} (GMT+5). First up: ${label}.`)
        return
      }
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
