import { Hono } from 'hono'
import type { Env, Vars } from './types'
import { SEED_OWNER } from './seed-owner'
import { getProfile } from './db/profile'
import Layout from './views/Layout'
import publicRoutes from './routes/public'
import mediaRoutes from './routes/media'
import authRoutes from './routes/auth'
import adminRoutes from './routes/admin'
import telegramRoutes from './routes/telegram'
import { ensureAdmin } from './bootstrap'
import { localeMiddleware } from './i18n/locale'
import { handleScheduled } from './telegram/scheduled'


const app = new Hono<{ Bindings: Env; Variables: Vars }>()

function isBarePath(path: string): boolean {
  return path === '/healthz' || path.startsWith('/telegram')
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

// Run once per isolate lifetime. seeded is a module-level flag so this only
// hits the DB on the first request after a cold start. ensureAdmin is itself
// idempotent via countAccounts, so a concurrent cold-start race is harmless.
let seeded = false
app.use('*', async (c, next) => {
  if (!seeded) {
    await ensureAdmin(c.env.DB, c.env.ADMIN_BOOTSTRAP_PASSWORD)
    seeded = true
  }
  await next()
})

// ── Global middleware ─────────────────────────────────────────────────────────

// Skip HTML layout / locale / owner for health + Telegram webhook.
app.use('*', async (c, next) => {
  if (isBarePath(c.req.path)) return next()
  return Layout(c, next)
})

app.use('*', async (c, next) => {
  if (isBarePath(c.req.path)) return next()
  return localeMiddleware(c, next)
})

app.use('*', async (c, next) => {
  if (isBarePath(c.req.path)) return next()
  c.set('owner', (await getProfile(c.env.DB)) ?? SEED_OWNER)
  await next()
})

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/healthz', async (c) => {
  try { await c.env.DB.prepare('SELECT 1').first(); return c.text('ok') }
  catch { return c.text('db unavailable', 503) }
})

app.route('/', telegramRoutes)
app.route('/', authRoutes)
app.route('/', adminRoutes)
app.route('/', publicRoutes)
app.route('/', mediaRoutes)

export default {
  fetch: app.fetch.bind(app),
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduled(event, env))
  },
}
