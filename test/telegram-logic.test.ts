import { env } from 'cloudflare:workers'
import { describe, it, expect, beforeEach } from 'vitest'
import type { Env } from '../src/types'
import type { TelegramApi } from '../src/telegram/api'
import * as db from '../src/telegram/db'
import { handleOkVote, runEvening, runMorning } from '../src/telegram/logic'

const typedEnv = env as unknown as Env
const database = typedEnv.DB

function mockApi(overrides: Partial<TelegramApi> = {}): TelegramApi & {
  sent: { chatId: number; text: string }[]
  edited: { chatId: number; messageId: number; text: string }[]
  answers: string[]
} {
  const sent: { chatId: number; text: string }[] = []
  const edited: { chatId: number; messageId: number; text: string }[] = []
  const answers: string[] = []
  let messageId = 100
  return {
    sent,
    edited,
    answers,
    async getMe() {
      return { id: 99, username: 'CleanBot', first_name: 'CleanBot' }
    },
    async sendMessage(chatId, text) {
      sent.push({ chatId, text })
      messageId += 1
      return { message_id: messageId }
    },
    async editMessageText(chatId, messageId, text) {
      edited.push({ chatId, messageId, text })
    },
    async answerCallbackQuery(_id, text) {
      if (text) answers.push(text)
    },
    async getChatMember() {
      return { status: 'member' }
    },
    ...overrides,
  }
}

async function resetCleaningTables() {
  await database.prepare('DELETE FROM cleaning_votes').run()
  await database.prepare('DELETE FROM cleaning_days').run()
  await database.prepare('DELETE FROM cleaning_members').run()
  await database.prepare('DELETE FROM cleaning_group').run()
}

async function seedRotation() {
  await db.bindGroup(database, -100, '2026-08-09T00:00:00.000Z')
  await db.addMember(database, 1, 'Alice', 'alice')
  await db.addMember(database, 2, 'Bob', 'bob')
  await db.addMember(database, 3, 'Carol', 'carol')
  await db.addMember(database, 4, 'Dave', 'dave')
}

describe('cleaning bot logic', () => {
  beforeEach(async () => {
    await resetCleaningTables()
    await seedRotation()
  })

  it('morning announces duty; evening opens vote; 3 OKs pass and advance', async () => {
    const api = mockApi()
    const morning = new Date('2026-08-09T03:00:00.000Z') // 08:00 GMT+5
    await runMorning(database, api, morning)
    expect(api.sent.at(-1)?.text).toContain('@alice')

    const evening = new Date('2026-08-09T15:00:00.000Z') // 20:00 GMT+5
    await runEvening(database, api, evening)
    const day = await db.getDayByDate(database, '2026-08-09')
    expect(day?.status).toBe('voting')
    expect(day?.vote_message_id).toBeTruthy()

    const voteMsgId = day!.vote_message_id!

    // Self-vote rejected
    const self = await handleOkVote(database, api, {
      chatId: -100,
      messageId: voteMsgId,
      voterUserId: 1,
      dayId: day!.id,
      callbackQueryId: 'cq1',
      now: evening,
    })
    expect(self).toEqual({ ok: false, reason: 'self_vote' })

    // Wrong chat rejected
    const wrongChat = await handleOkVote(database, api, {
      chatId: -999,
      messageId: voteMsgId,
      voterUserId: 2,
      dayId: day!.id,
      callbackQueryId: 'cq2',
      now: evening,
    })
    expect(wrongChat).toEqual({ ok: false, reason: 'wrong_chat' })

    for (const voter of [2, 3, 4]) {
      const r = await handleOkVote(database, api, {
        chatId: -100,
        messageId: voteMsgId,
        voterUserId: voter,
        dayId: day!.id,
        callbackQueryId: `cq${voter}`,
        now: evening,
      })
      expect(r.ok).toBe(true)
    }

    const closed = await db.getDayById(database, day!.id)
    expect(closed?.status).toBe('passed')
    const group = await db.getGroup(database)
    expect(group?.current_member_id).toBe(2) // Bob next
  })

  it('failed evening vote keeps same duty the next morning', async () => {
    const api = mockApi()
    const day1Morning = new Date('2026-08-09T03:00:00.000Z')
    await runMorning(database, api, day1Morning)
    await runEvening(database, api, new Date('2026-08-09T15:00:00.000Z'))

    const day = await db.getDayByDate(database, '2026-08-09')
    // Only one OK — not enough
    await handleOkVote(database, api, {
      chatId: -100,
      messageId: day!.vote_message_id!,
      voterUserId: 2,
      dayId: day!.id,
      callbackQueryId: 'cq',
      now: new Date('2026-08-09T15:05:00.000Z'),
    })

    api.sent.length = 0
    await runMorning(database, api, new Date('2026-08-10T03:00:00.000Z'))
    const y = await db.getDayByDate(database, '2026-08-09')
    expect(y?.status).toBe('failed')
    const today = await db.getDayByDate(database, '2026-08-10')
    expect(today?.duty_user_id).toBe(1)
    expect(api.sent.at(-1)?.text).toMatch(/Same turn today: @alice/)
  })

  it('rejects non-rotation voters and left members', async () => {
    const api = mockApi()
    await runMorning(database, api, new Date('2026-08-09T03:00:00.000Z'))
    await runEvening(database, api, new Date('2026-08-09T15:00:00.000Z'))
    const day = await db.getDayByDate(database, '2026-08-09')!

    const outsider = await handleOkVote(database, api, {
      chatId: -100,
      messageId: day.vote_message_id!,
      voterUserId: 999,
      dayId: day.id,
      callbackQueryId: 'cq-out',
    })
    expect(outsider).toEqual({ ok: false, reason: 'not_member' })

    const leftApi = mockApi({
      async getChatMember() {
        return { status: 'left' }
      },
    })
    const left = await handleOkVote(database, leftApi, {
      chatId: -100,
      messageId: day.vote_message_id!,
      voterUserId: 2,
      dayId: day.id,
      callbackQueryId: 'cq-left',
    })
    expect(left).toEqual({ ok: false, reason: 'not_in_group' })
  })
})
