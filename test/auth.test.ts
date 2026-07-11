import { env } from 'cloudflare:test'
import { Hono } from 'hono'
import { describe, it, expect } from 'vitest'
import type { Env, Vars } from '../src/types'
import { setSession, clearSession, isAuthenticated } from '../src/auth/session'
import { issueCsrf, verifyCsrf } from '../src/auth/csrf'
import { requireAuth } from '../src/auth/guard'

// Build a tiny test app to exercise cookie round-trips via SELF-like fetch calls.
// We call app.fetch() directly with the Env bindings so signed cookies use SESSION_SECRET.

function makeApp() {
  const app = new Hono<{ Bindings: Env; Variables: Vars }>()

  // POST /set-session  → sets session cookie, returns 200
  app.post('/set-session', async (c) => {
    await setSession(c, c.env.SESSION_SECRET)
    return c.text('ok')
  })

  // POST /clear-session → clears session cookie, returns 200
  app.post('/clear-session', (c) => {
    clearSession(c)
    return c.text('cleared')
  })

  // GET /is-auth → reads session cookie, returns "true" or "false"
  app.get('/is-auth', async (c) => {
    const ok = await isAuthenticated(c, c.env.SESSION_SECRET)
    return c.text(String(ok))
  })

  // GET /protected (guarded route) → redirects to /login if not authenticated
  app.get('/protected', requireAuth, (c) => c.text('secret'))

  // POST /csrf/issue → issues a CSRF token (sets cookie + returns token in body)
  app.post('/csrf/issue', async (c) => {
    const token = await issueCsrf(c, c.env.SESSION_SECRET)
    return c.text(token)
  })

  // POST /csrf/verify → verifies a CSRF token (reads _csrf from body + checks cookie)
  app.post('/csrf/verify', async (c) => {
    const ok = await verifyCsrf(c, c.env.SESSION_SECRET)
    return c.text(String(ok))
  })

  return app
}

// Helper: extract Set-Cookie header from a response
function getCookieHeader(res: Response): string | null {
  return res.headers.get('set-cookie')
}

// Helper: build a Cookie header from a Set-Cookie string (strips attributes)
function toCookieHeader(setCookie: string): string {
  return setCookie.split(';')[0].trim()
}

describe('auth', () => {
  const app = makeApp()
  const typedEnv = env as unknown as Env

  // ─── Session ─────────────────────────────────────────────────────────────────

  it('setSession + isAuthenticated: round-trip returns true', async () => {
    // 1. Call /set-session → get the signed session cookie
    const setRes = await app.fetch(
      new Request('https://example.com/set-session', { method: 'POST' }),
      typedEnv,
    )
    expect(setRes.status).toBe(200)
    const setCookieHeader = getCookieHeader(setRes)
    expect(setCookieHeader).not.toBeNull()

    // 2. Feed the cookie back to /is-auth
    const authRes = await app.fetch(
      new Request('https://example.com/is-auth', {
        headers: { Cookie: toCookieHeader(setCookieHeader!) },
      }),
      typedEnv,
    )
    expect(await authRes.text()).toBe('true')
  })

  it('isAuthenticated: no cookie → false', async () => {
    const res = await app.fetch(
      new Request('https://example.com/is-auth'),
      typedEnv,
    )
    expect(await res.text()).toBe('false')
  })

  it('isAuthenticated: tampered cookie value → false', async () => {
    // A cookie that looks like a signed value but has been altered
    const res = await app.fetch(
      new Request('https://example.com/is-auth', {
        headers: { Cookie: 'session=hacked.invalidsignature' },
      }),
      typedEnv,
    )
    expect(await res.text()).toBe('false')
  })

  it('clearSession: after clear the cookie is gone and isAuthenticated → false', async () => {
    // 1. Set session
    const setRes = await app.fetch(
      new Request('https://example.com/set-session', { method: 'POST' }),
      typedEnv,
    )
    const sessionCookie = toCookieHeader(getCookieHeader(setRes)!)

    // 2. Clear session — the response carries a Set-Cookie that expires/empties the cookie
    const clearRes = await app.fetch(
      new Request('https://example.com/clear-session', {
        method: 'POST',
        headers: { Cookie: sessionCookie },
      }),
      typedEnv,
    )
    expect(clearRes.status).toBe(200)

    // 3. Extract the invalidated cookie from the clear response and send IT to /is-auth.
    //    This proves the expired/emptied Set-Cookie neutralizes an in-flight session
    //    cookie rather than merely re-testing the "no cookie → false" baseline.
    const clearedSetCookie = getCookieHeader(clearRes)
    expect(clearedSetCookie).not.toBeNull()
    const clearedCookieHeader = toCookieHeader(clearedSetCookie!)

    const authRes = await app.fetch(
      new Request('https://example.com/is-auth', {
        headers: { Cookie: clearedCookieHeader },
      }),
      typedEnv,
    )
    expect(await authRes.text()).toBe('false')
  })

  // ─── requireAuth guard ────────────────────────────────────────────────────────

  it('requireAuth: unauthenticated request → 302 redirect to /login', async () => {
    const res = await app.fetch(
      new Request('https://example.com/protected'),
      typedEnv,
    )
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/login')
  })

  it('requireAuth: authenticated request → 200 with body', async () => {
    const setRes = await app.fetch(
      new Request('https://example.com/set-session', { method: 'POST' }),
      typedEnv,
    )
    const sessionCookie = toCookieHeader(getCookieHeader(setRes)!)

    const res = await app.fetch(
      new Request('https://example.com/protected', {
        headers: { Cookie: sessionCookie },
      }),
      typedEnv,
    )
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('secret')
  })

  // ─── CSRF ─────────────────────────────────────────────────────────────────────

  it('verifyCsrf: matching token → true', async () => {
    // 1. Issue a CSRF token
    const issueRes = await app.fetch(
      new Request('https://example.com/csrf/issue', { method: 'POST' }),
      typedEnv,
    )
    const csrfToken = await issueRes.text()
    expect(csrfToken).toMatch(/^[0-9a-f-]{36}$/) // UUID format

    const csrfCookie = toCookieHeader(getCookieHeader(issueRes)!)

    // 2. POST the same token back as a form body
    const body = new URLSearchParams({ _csrf: csrfToken })
    const verifyRes = await app.fetch(
      new Request('https://example.com/csrf/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: csrfCookie,
        },
        body: body.toString(),
      }),
      typedEnv,
    )
    expect(await verifyRes.text()).toBe('true')
  })

  it('verifyCsrf: wrong token in body → false', async () => {
    const issueRes = await app.fetch(
      new Request('https://example.com/csrf/issue', { method: 'POST' }),
      typedEnv,
    )
    const csrfCookie = toCookieHeader(getCookieHeader(issueRes)!)

    const body = new URLSearchParams({ _csrf: 'wrong-token' })
    const verifyRes = await app.fetch(
      new Request('https://example.com/csrf/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: csrfCookie,
        },
        body: body.toString(),
      }),
      typedEnv,
    )
    expect(await verifyRes.text()).toBe('false')
  })

  it('verifyCsrf: no cookie → false', async () => {
    const body = new URLSearchParams({ _csrf: 'some-token' })
    const verifyRes = await app.fetch(
      new Request('https://example.com/csrf/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      }),
      typedEnv,
    )
    expect(await verifyRes.text()).toBe('false')
  })

  it('verifyCsrf: mismatched Origin header → false', async () => {
    const issueRes = await app.fetch(
      new Request('https://example.com/csrf/issue', { method: 'POST' }),
      typedEnv,
    )
    const csrfToken = await issueRes.text()
    const csrfCookie = toCookieHeader(getCookieHeader(issueRes)!)

    const body = new URLSearchParams({ _csrf: csrfToken })
    const verifyRes = await app.fetch(
      new Request('https://example.com/csrf/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: csrfCookie,
          Origin: 'https://evil.com',
        },
        body: body.toString(),
      }),
      typedEnv,
    )
    expect(await verifyRes.text()).toBe('false')
  })
})
