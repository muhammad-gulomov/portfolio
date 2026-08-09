import { env } from 'cloudflare:workers'
import { describe, it, expect, beforeEach } from 'vitest'
import type { Env } from '../src/types'
import type { TelegramApi } from '../src/telegram/api'
import * as db from '../src/telegram/db'
import { resolveTargets } from '../src/telegram/commands'

const typedEnv = env as unknown as Env
const database = typedEnv.DB

function mockApi(overrides: Partial<TelegramApi> = {}): TelegramApi {
  return {
    async getMe() {
      return { id: 99, username: 'CleanBot', first_name: 'CleanBot' }
    },
    async getChat(chatId) {
      if (chatId === '@dudeperfect_26') {
        return {
          id: 1001,
          type: 'private',
          username: 'dudeperfect_26',
          first_name: 'Dude',
        }
      }
      throw new Error('chat not found')
    },
    async sendMessage() {
      return { message_id: 1 }
    },
    async editMessageText() {},
    async answerCallbackQuery() {},
    async getChatMember() {
      return { status: 'member' }
    },
    ...overrides,
  }
}

describe('resolveTargets for /add', () => {
  beforeEach(async () => {
    await database.prepare('DELETE FROM cleaning_known_users').run()
  })

  it('resolves multiple @usernames via getChat', async () => {
    const api = mockApi()
    const { targets, unresolved } = await resolveTargets(
      database,
      api,
      {
        message_id: 1,
        chat: { id: -1, type: 'supergroup' },
        text: '/add @dudeperfect_26 @missing_user',
        from: { id: 1, first_name: 'Admin' },
      },
      '@dudeperfect_26 @missing_user',
    )
    expect(targets.map((t) => t.user.id)).toEqual([1001])
    expect(unresolved).toEqual(['@missing_user'])
  })

  it('resolves @username from known-user cache', async () => {
    await db.rememberUser(database, {
      id: 2002,
      username: 'Yahyoyev_os',
      first_name: 'Yahyo',
    })
    const api = mockApi({
      async getChat() {
        throw new Error('should use cache')
      },
    })
    const { targets, unresolved } = await resolveTargets(
      database,
      api,
      {
        message_id: 1,
        chat: { id: -1, type: 'supergroup' },
        from: { id: 1 },
        text: '/add @Yahyoyev_os',
      },
      '@Yahyoyev_os',
    )
    expect(unresolved).toEqual([])
    expect(targets[0]?.user.id).toBe(2002)
  })
})
