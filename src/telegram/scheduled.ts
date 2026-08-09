import type { Env } from '../types'
import { createTelegramApi } from './api'
import { runEvening, runMorning } from './logic'
import { CRON_EVENING, CRON_MORNING } from './time'

export async function handleScheduled(event: { cron: string }, env: Env): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) return
  const api = createTelegramApi(env.TELEGRAM_BOT_TOKEN)

  if (event.cron === CRON_MORNING) {
    await runMorning(env.DB, api)
    return
  }
  if (event.cron === CRON_EVENING) {
    await runEvening(env.DB, api)
  }
}
