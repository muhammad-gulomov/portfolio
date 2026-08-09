import type { TelegramApi } from './api'
import { isActiveChatMember } from './api'
import { OK_THRESHOLD } from './constants'
import {
  eveningPassedMessage,
  eveningVoteMessage,
  morningDutyMessage,
  tagMember,
} from './copy'
import * as db from './db'
import { dateInGmtPlus5, isDateBefore, previousDateGmtPlus5 } from './time'

export type VoteRejectReason =
  | 'no_day'
  | 'not_voting'
  | 'wrong_chat'
  | 'wrong_message'
  | 'self_vote'
  | 'not_member'
  | 'not_in_group'
  | 'already_voted'
  | 'already_closed'

export type VoteResult =
  | { ok: true; count: number; passed: boolean }
  | { ok: false; reason: VoteRejectReason }

export async function runMorning(database: D1Database, api: TelegramApi, now: Date = new Date()): Promise<void> {
  const group = await db.getGroup(database)
  if (!group) return

  const today = dateInGmtPlus5(now)
  if (group.starts_on && isDateBefore(today, group.starts_on)) return

  const yesterday = previousDateGmtPlus5(today)

  const yDay = await db.getDayByDate(database, yesterday)
  let yesterdayFailed = yDay?.status === 'failed'
  let yesterdayPassed = yDay?.status === 'passed'
  if (yDay && (yDay.status === 'pending' || yDay.status === 'voting')) {
    await db.updateDayStatus(database, yDay.id, 'failed')
    yesterdayFailed = true
    yesterdayPassed = false
    // Keep current_member_id — same person repeats.
  }

  let todayDay = await db.getDayByDate(database, today)
  if (!todayDay) {
    const members = await db.listActiveMembers(database)
    if (members.length === 0) {
      await api.sendMessage(
        group.chat_id,
        'No cleaning rotation members yet. An admin should reply to someone with /add.',
      )
      return
    }
    let dutyId = group.current_member_id
    if (dutyId == null || !members.some((m) => m.telegram_user_id === dutyId)) {
      dutyId = members[0].telegram_user_id
      await db.setCurrentMember(database, dutyId)
    }
    todayDay = await db.createDay(database, today, dutyId, now.toISOString())
  }

  const duty = await db.getMemberByTelegramId(database, todayDay.duty_user_id)
  const tag = tagMember(duty, todayDay.duty_user_id)
  const kind = yesterdayFailed ? 'repeat' : yesterdayPassed ? 'after_pass' : 'fresh'
  await api.sendMessage(group.chat_id, morningDutyMessage(tag, kind), { parse_mode: 'HTML' })
}

export async function runEvening(database: D1Database, api: TelegramApi, now: Date = new Date()): Promise<void> {
  const group = await db.getGroup(database)
  if (!group) return

  const today = dateInGmtPlus5(now)
  if (group.starts_on && isDateBefore(today, group.starts_on)) return

  let todayDay = await db.getDayByDate(database, today)
  if (!todayDay) {
    // Morning cron missed — create day now.
    const members = await db.listActiveMembers(database)
    if (members.length === 0) return
    const dutyId = group.current_member_id ?? members[0].telegram_user_id
    todayDay = await db.createDay(database, today, dutyId, now.toISOString())
  }

  if (todayDay.status === 'passed' || todayDay.status === 'failed') return
  if (todayDay.status === 'voting' && todayDay.vote_message_id != null) return

  const duty = await db.getMemberByTelegramId(database, todayDay.duty_user_id)
  const tag = tagMember(duty, todayDay.duty_user_id)
  const text = eveningVoteMessage(tag)

  const msg = await api.sendMessage(group.chat_id, text, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: 'OK', callback_data: `clean_ok:${todayDay.id}` }]],
    },
  })
  await db.updateDayStatus(database, todayDay.id, 'voting', msg.message_id)
}

export async function handleOkVote(
  database: D1Database,
  api: TelegramApi,
  opts: {
    chatId: number
    messageId: number
    voterUserId: number
    dayId: number
    callbackQueryId: string
    now?: Date
  },
): Promise<VoteResult> {
  const now = opts.now ?? new Date()
  const group = await db.getGroup(database)
  if (!group || group.chat_id !== opts.chatId) {
    await api.answerCallbackQuery(opts.callbackQueryId, 'Wrong chat.')
    return { ok: false, reason: 'wrong_chat' }
  }

  const day = await db.getDayById(database, opts.dayId)
  if (!day) {
    await api.answerCallbackQuery(opts.callbackQueryId, 'Unknown vote.')
    return { ok: false, reason: 'no_day' }
  }
  if (day.status === 'passed' || day.status === 'failed') {
    await api.answerCallbackQuery(opts.callbackQueryId, 'Already closed.')
    return { ok: false, reason: 'already_closed' }
  }
  if (day.status !== 'voting') {
    await api.answerCallbackQuery(opts.callbackQueryId, 'Voting is not open.')
    return { ok: false, reason: 'not_voting' }
  }
  if (day.vote_message_id == null || day.vote_message_id !== opts.messageId) {
    await api.answerCallbackQuery(opts.callbackQueryId, 'Stale vote message.')
    return { ok: false, reason: 'wrong_message' }
  }
  if (opts.voterUserId === day.duty_user_id) {
    await api.answerCallbackQuery(opts.callbackQueryId, 'You cannot OK your own turn.')
    return { ok: false, reason: 'self_vote' }
  }

  const voter = await db.getMemberByTelegramId(database, opts.voterUserId)
  if (!voter || !voter.active) {
    await api.answerCallbackQuery(opts.callbackQueryId, 'Only rotation members can vote.')
    return { ok: false, reason: 'not_member' }
  }

  const member = await api.getChatMember(opts.chatId, opts.voterUserId)
  if (!isActiveChatMember(member.status)) {
    await api.answerCallbackQuery(opts.callbackQueryId, 'You must be in the group.')
    return { ok: false, reason: 'not_in_group' }
  }

  if (await db.hasVoted(database, day.id, opts.voterUserId)) {
    await api.answerCallbackQuery(opts.callbackQueryId, 'You already voted.')
    return { ok: false, reason: 'already_voted' }
  }

  const inserted = await db.addVote(database, day.id, opts.voterUserId, now.toISOString())
  if (!inserted) {
    await api.answerCallbackQuery(opts.callbackQueryId, 'You already voted.')
    return { ok: false, reason: 'already_voted' }
  }

  const count = await db.countVotes(database, day.id)
  const duty = await db.getMemberByTelegramId(database, day.duty_user_id)
  const tag = tagMember(duty, day.duty_user_id)

  if (count >= OK_THRESHOLD) {
    await db.updateDayStatus(database, day.id, 'passed')
    const next = await db.nextActiveMember(database, day.duty_user_id)
    if (next) await db.setCurrentMember(database, next.telegram_user_id)

    const nextTag = tagMember(next, next?.telegram_user_id ?? 0)
    await api.editMessageText(
      opts.chatId,
      opts.messageId,
      eveningPassedMessage(tag, nextTag, count),
      { parse_mode: 'HTML' },
    )
    await api.answerCallbackQuery(opts.callbackQueryId, 'Confirmed — turn passed.')
    return { ok: true, count, passed: true }
  }

  await api.editMessageText(opts.chatId, opts.messageId, eveningVoteMessage(tag, count), {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[{ text: 'OK', callback_data: `clean_ok:${day.id}` }]],
    },
  })
  await api.answerCallbackQuery(opts.callbackQueryId, `Recorded (${count}/${OK_THRESHOLD}).`)
  return { ok: true, count, passed: false }
}

export { OK_THRESHOLD }
