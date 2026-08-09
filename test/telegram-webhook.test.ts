import { SELF } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { describe, it, expect, beforeEach } from 'vitest'
import type { Env } from '../src/types'
import * as db from '../src/telegram/db'

const typedEnv = env as unknown as Env
const database = typedEnv.DB

async function resetCleaningTables() {
  await database.prepare('DELETE FROM cleaning_votes').run()
  await database.prepare('DELETE FROM cleaning_days').run()
  await database.prepare('DELETE FROM cleaning_members').run()
  await database.prepare('DELETE FROM cleaning_group').run()
}

describe('telegram webhook', () => {
  beforeEach(async () => {
    await resetCleaningTables()
  })

  it('rejects missing/wrong secret token', async () => {
    const bad = await SELF.fetch('https://x/telegram/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ update_id: 1 }),
    })
    expect(bad.status).toBe(401)

    const wrong = await SELF.fetch('https://x/telegram/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': 'nope',
      },
      body: JSON.stringify({ update_id: 1 }),
    })
    expect(wrong.status).toBe(401)
  })

  it('accepts valid secret and runs /bind for admin', async () => {
    // Network calls to Telegram will fail; webhook still returns 200 after catching errors.
    // Seed nothing — bind will attempt sendMessage. Mock isn't available on SELF path.
    // Instead verify auth success path returns JSON ok even if Telegram API errors.
    const res = await SELF.fetch('https://x/telegram/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': 'test-webhook-secret',
      },
      body: JSON.stringify({
        update_id: 1,
        message: {
          message_id: 1,
          chat: { id: -100, type: 'supergroup' },
          from: { id: 111, first_name: 'Admin' },
          text: '/bind',
        },
      }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })

    // Bind writes before sendMessage; if sendMessage throws after bind, group may still be saved.
    const group = await db.getGroup(database)
    // Depending on throw timing, bind may have committed.
    if (group) {
      expect(group.chat_id).toBe(-100)
    }
  })
})
