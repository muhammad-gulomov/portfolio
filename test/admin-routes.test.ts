import { env } from 'cloudflare:workers'
import { SELF } from 'cloudflare:test'
import { describe, it, expect, beforeEach } from 'vitest'
import type { Env } from '../src/types'
import { ensureAdmin } from '../src/bootstrap'
import { listAll } from '../src/db/blog'

const db = (env as unknown as Env).DB

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Obtain a CSRF token+cookie pair by hitting GET /login.
 * Returns { csrfCookie, csrfToken }.
 * - csrfCookie: the raw "csrf=..." Set-Cookie header value (to forward as Cookie)
 * - csrfToken: the hidden _csrf field value from the HTML form
 */
async function getCsrf(): Promise<{ csrfCookie: string; csrfToken: string }> {
  const res = await SELF.fetch('https://x/login', { redirect: 'manual' })
  // The csrf signed cookie is in Set-Cookie header
  const setCookie = res.headers.get('set-cookie') ?? ''
  // Extract the first cookie (csrf=... or multiple; take the csrf one)
  const csrfCookieMatch = setCookie.match(/(csrf=[^;]+)/)
  if (!csrfCookieMatch) throw new Error('No csrf cookie in GET /login response')
  const csrfCookie = csrfCookieMatch[1]

  // Extract the _csrf hidden field value from the HTML
  const html = await res.text()
  const tokenMatch = html.match(/name="_csrf"\s+value="([^"]+)"/)
  if (!tokenMatch) throw new Error('No _csrf field in login form HTML')
  const csrfToken = tokenMatch[1]

  return { csrfCookie, csrfToken }
}

/**
 * Log in with seeded credentials. Returns the session cookie string.
 */
async function login(username = 'muhammad', password = 'testpass123'): Promise<string> {
  const { csrfCookie, csrfToken } = await getCsrf()
  const body = new URLSearchParams({ username, password, _csrf: csrfToken })
  const res = await SELF.fetch('https://x/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: csrfCookie,
    },
    body: body.toString(),
    redirect: 'manual',
  })
  // Session cookie is in Set-Cookie
  const setCookie = res.headers.get('set-cookie') ?? ''
  const sessionMatch = setCookie.match(/(session=[^;]+)/)
  if (!sessionMatch) throw new Error(`Login failed — no session cookie. Status: ${res.status}, Location: ${res.headers.get('location')}`)
  return sessionMatch[1]
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await db.exec('DELETE FROM admin_account')
  await db.exec('DELETE FROM blog_posts')
  await db.exec('DELETE FROM work_experiences')
  await db.exec('DELETE FROM projects')
  // Seed admin for each test
  await ensureAdmin(db, 'testpass123')
})

// ── Auth guard ────────────────────────────────────────────────────────────────

describe('GET /admin unauthenticated', () => {
  it('redirects to /login with 302', async () => {
    const res = await SELF.fetch('https://x/admin', { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/login')
  })
})

// ── GET /login ─────────────────────────────────────────────────────────────────

describe('GET /login', () => {
  it('returns 200 with a login form containing _csrf field', async () => {
    const res = await SELF.fetch('https://x/login')
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('name="_csrf"')
    expect(html).toContain('name="username"')
    expect(html).toContain('name="password"')
  })

  it('sets a csrf cookie', async () => {
    const res = await SELF.fetch('https://x/login', { redirect: 'manual' })
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('csrf=')
  })

  it('shows error message when ?error=1', async () => {
    const res = await SELF.fetch('https://x/login?error=1')
    const html = await res.text()
    expect(html).toContain('Incorrect username')
  })

  it('shows signed-out note when ?logout=1', async () => {
    const res = await SELF.fetch('https://x/login?logout=1')
    const html = await res.text()
    expect(html.toLowerCase()).toContain('signed out')
  })
})

// ── POST /login ───────────────────────────────────────────────────────────────

describe('POST /login', () => {
  it('correct credentials → sets session cookie and redirects to /admin', async () => {
    const { csrfCookie, csrfToken } = await getCsrf()
    const body = new URLSearchParams({ username: 'muhammad', password: 'testpass123', _csrf: csrfToken })
    const res = await SELF.fetch('https://x/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: csrfCookie,
      },
      body: body.toString(),
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/admin')
    expect(res.headers.get('set-cookie') ?? '').toContain('session=')
  })

  it('wrong password → redirects to /login?error', async () => {
    const { csrfCookie, csrfToken } = await getCsrf()
    const body = new URLSearchParams({ username: 'muhammad', password: 'wrongpass', _csrf: csrfToken })
    const res = await SELF.fetch('https://x/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: csrfCookie,
      },
      body: body.toString(),
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('/login?error')
  })

  it('wrong username → redirects to /login?error', async () => {
    const { csrfCookie, csrfToken } = await getCsrf()
    const body = new URLSearchParams({ username: 'notexist', password: 'testpass123', _csrf: csrfToken })
    const res = await SELF.fetch('https://x/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: csrfCookie,
      },
      body: body.toString(),
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toContain('/login?error')
  })

  it('missing _csrf → does not set session, redirects to /login?error', async () => {
    // No csrf cookie, no csrf token
    const body = new URLSearchParams({ username: 'muhammad', password: 'testpass123' })
    const res = await SELF.fetch('https://x/login', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain('/login?error')
    expect(res.headers.get('set-cookie') ?? '').not.toContain('session=')
  })
})

// ── POST /logout ──────────────────────────────────────────────────────────────

describe('POST /logout', () => {
  it('clears session and redirects to /', async () => {
    const sessionCookie = await login()
    const { csrfCookie, csrfToken } = await getCsrf()
    const body = new URLSearchParams({ _csrf: csrfToken })
    const res = await SELF.fetch('https://x/logout', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: `${sessionCookie}; ${csrfCookie}`,
      },
      body: body.toString(),
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/')
  })
})

// ── GET /admin (authenticated) ────────────────────────────────────────────────

describe('GET /admin authenticated', () => {
  it('returns 200 with dashboard content', async () => {
    const sessionCookie = await login()
    const res = await SELF.fetch('https://x/admin', {
      headers: { cookie: sessionCookie },
    })
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Admin')
    expect(html.toLowerCase()).toContain('dashboard')
  })
})

// ── CSRF rejection on admin POSTs ─────────────────────────────────────────────

describe('POST /admin/posts without valid CSRF', () => {
  it('is rejected (redirect) and does not create a post', async () => {
    const sessionCookie = await login()
    // POST with no _csrf at all
    const body = new URLSearchParams({
      title: 'Should Not Exist',
      content: 'Content here',
      published: '1',
    })
    const res = await SELF.fetch('https://x/admin/posts', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: sessionCookie,
      },
      body: body.toString(),
      redirect: 'manual',
    })
    // Should redirect (302) rather than process
    expect(res.status).toBe(302)
    // The post should NOT have been created
    const posts = await listAll(db)
    expect(posts.find((p) => p.title === 'Should Not Exist')).toBeUndefined()
  })
})

// ── Create post flow ──────────────────────────────────────────────────────────

describe('POST /admin/posts (valid CSRF + session) creates a post', () => {
  it('creates post and it appears in GET /admin', async () => {
    const sessionCookie = await login()

    // Get a fresh csrf for the admin dashboard (issued by GET /admin)
    // We can also just use GET /admin which issues a csrf
    const dashRes = await SELF.fetch('https://x/admin', {
      headers: { cookie: sessionCookie },
      redirect: 'manual',
    })
    const dashHtml = await dashRes.text()
    const dashSetCookie = dashRes.headers.get('set-cookie') ?? ''
    const csrfCookieMatch = dashSetCookie.match(/(csrf=[^;]+)/)
    if (!csrfCookieMatch) throw new Error('No csrf cookie from GET /admin')
    const csrfCookie = csrfCookieMatch[1]
    const tokenMatch = dashHtml.match(/name="_csrf"\s+value="([^"]+)"/)
    if (!tokenMatch) throw new Error('No _csrf token in /admin HTML')
    const csrfToken = tokenMatch[1]

    // POST the new post
    const body = new URLSearchParams({
      id: '',
      title: 'My Test Post',
      slug: 'my-test-post',
      excerpt: 'A test excerpt',
      content: '## Hello\n\nTest content.',
      published: 'true',
      _csrf: csrfToken,
    })
    const postRes = await SELF.fetch('https://x/admin/posts', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: `${sessionCookie}; ${csrfCookie}`,
      },
      body: body.toString(),
      redirect: 'manual',
    })
    expect(postRes.status).toBe(302)
    expect(postRes.headers.get('location')).toBe('/admin')

    // Verify it appears in GET /admin
    const adminRes = await SELF.fetch('https://x/admin', {
      headers: { cookie: sessionCookie },
    })
    expect(adminRes.status).toBe(200)
    const adminHtml = await adminRes.text()
    expect(adminHtml).toContain('My Test Post')

    // Also verify DB directly
    const posts = await listAll(db)
    expect(posts.find((p) => p.title === 'My Test Post')).toBeDefined()
  })
})

// ── POST /admin/account ───────────────────────────────────────────────────────

/**
 * Helper: POST /admin/account with a valid session + fresh CSRF.
 * Returns the response (redirect: 'manual').
 */
async function postAccount(
  sessionCookie: string,
  fields: Record<string, string>,
): Promise<Response> {
  // Get a fresh CSRF token from GET /admin/profile (admin area)
  const profileRes = await SELF.fetch('https://x/admin/profile', {
    headers: { cookie: sessionCookie },
    redirect: 'manual',
  })
  const profileHtml = await profileRes.text()
  const profileSetCookie = profileRes.headers.get('set-cookie') ?? ''
  const csrfCookieMatch = profileSetCookie.match(/(csrf=[^;]+)/)
  if (!csrfCookieMatch) throw new Error('No csrf cookie from GET /admin/profile')
  const csrfCookie = csrfCookieMatch[1]
  const tokenMatch = profileHtml.match(/name="_csrf"\s+value="([^"]+)"/)
  if (!tokenMatch) throw new Error('No _csrf token in /admin/profile HTML')
  const csrfToken = tokenMatch[1]

  const body = new URLSearchParams({ _csrf: csrfToken, ...fields })
  return SELF.fetch('https://x/admin/account', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: `${sessionCookie}; ${csrfCookie}`,
    },
    body: body.toString(),
    redirect: 'manual',
  })
}

describe('POST /admin/account — blank password leaves hash unchanged', () => {
  it('updates username only; original password still works; new username required for login', async () => {
    const sessionCookie = await login('muhammad', 'testpass123')

    // POST a username change with blank password
    const res = await postAccount(sessionCookie, { username: 'newadmin', password: '' })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/admin/profile')

    // Login with the OLD username should now FAIL (username changed)
    const failRes = await (async () => {
      const { csrfCookie, csrfToken } = await getCsrf()
      const body = new URLSearchParams({ username: 'muhammad', password: 'testpass123', _csrf: csrfToken })
      return SELF.fetch('https://x/login', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: csrfCookie },
        body: body.toString(),
        redirect: 'manual',
      })
    })()
    expect(failRes.headers.get('location')).toContain('/login?error')

    // Login with the NEW username + original password should SUCCEED (hash unchanged)
    const successCookie = await login('newadmin', 'testpass123')
    expect(successCookie).toContain('session=')
  })
})

describe('POST /admin/account — new non-blank password takes effect', () => {
  it('old password is rejected; new password succeeds', async () => {
    const sessionCookie = await login('muhammad', 'testpass123')

    // POST a password change (keep same username)
    const res = await postAccount(sessionCookie, { username: 'muhammad', password: 'newpass456' })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/admin/profile')

    // Old password should now FAIL
    const failRes = await (async () => {
      const { csrfCookie, csrfToken } = await getCsrf()
      const body = new URLSearchParams({ username: 'muhammad', password: 'testpass123', _csrf: csrfToken })
      return SELF.fetch('https://x/login', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: csrfCookie },
        body: body.toString(),
        redirect: 'manual',
      })
    })()
    expect(failRes.headers.get('location')).toContain('/login?error')

    // New password should SUCCEED
    const successCookie = await login('muhammad', 'newpass456')
    expect(successCookie).toContain('session=')
  })
})

// ── Bootstrap idempotency ─────────────────────────────────────────────────────

describe('ensureAdmin', () => {
  it('seeds account when table is empty', async () => {
    await db.exec('DELETE FROM admin_account')
    await ensureAdmin(db, 'mypassword')
    const row = await db.prepare('SELECT COUNT(*) AS n FROM admin_account').first<{ n: number }>()
    expect(row?.n).toBe(1)
  })

  it('is idempotent — calling twice does not error or duplicate', async () => {
    await db.exec('DELETE FROM admin_account')
    await ensureAdmin(db, 'mypassword')
    await ensureAdmin(db, 'mypassword')
    const row = await db.prepare('SELECT COUNT(*) AS n FROM admin_account').first<{ n: number }>()
    expect(row?.n).toBe(1)
  })
})
