import { Hono } from 'hono'
import type { Env, Vars } from './types'
import { SEED_OWNER } from './seed-owner'
import { getProfile } from './db/profile'
import Layout from './views/Layout'
import publicRoutes from './routes/public'
import blogRoutes from './routes/blog'
import mediaRoutes from './routes/media'
import authRoutes from './routes/auth'
import adminRoutes from './routes/admin'
import { ensureAdmin } from './bootstrap'


const app = new Hono<{ Bindings: Env; Variables: Vars }>()

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

// 1. jsxRenderer with root layout (must come before any c.render() call)
app.use('*', Layout)

// 2. Inject owner + currentYear into every request context (skip health check)
app.use('*', async (c, next) => {
  if (c.req.path === '/healthz') return next()
  c.set('currentYear', new Date().getFullYear())
  c.set('owner', (await getProfile(c.env.DB)) ?? SEED_OWNER)
  await next()
})

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/healthz', async (c) => {
  try { await c.env.DB.prepare('SELECT 1').first(); return c.text('ok') }
  catch { return c.text('db unavailable', 503) }
})

app.route('/', authRoutes)
app.route('/', adminRoutes)
app.route('/', publicRoutes)
app.route('/', blogRoutes)
app.route('/', mediaRoutes)

export default app
