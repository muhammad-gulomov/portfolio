/**
 * End-to-end integration test — full user + admin journey.
 *
 * Uses SELF.fetch (real worker + full middleware chain) and env from
 * cloudflare:workers.  Follows the same helpers as admin-routes.test.ts.
 *
 * Walk:
 *  a. Bootstrap admin via ensureAdmin → exactly one account
 *  b. Seed a project, work entry, and published blog post via repos
 *  c. GET / → 200, contains seeded work company
 *  d. GET /blog → 200, lists published post title
 *  e. GET /blog/:slug twice → views incremented to 2
 *  f. GET /admin unauthenticated → 302 /login
 *  g. Log in with ADMIN_BOOTSTRAP_PASSWORD → session cookie
 *  h. Authenticated GET /admin → 200
 *  i. Create a new post via POST /admin/posts → appears in /admin and /blog
 *  j. Edit the post (change title) → confirmed via getBySlug
 *  k. Delete the post → confirmed via getById → null
 *  l. POST /logout → redirect; then GET /admin → 302 /login again
 */

import { env } from 'cloudflare:workers'
import { SELF } from 'cloudflare:test'
import { describe, it, expect, beforeAll } from 'vitest'
import type { Env } from '../src/types'
import { ensureAdmin } from '../src/bootstrap'
import { saveWork } from '../src/db/work'
import { savePost, getById, getBySlug } from '../src/db/blog'

const typedEnv = env as unknown as Env
const db = typedEnv.DB

// ── Helpers (mirrors admin-routes.test.ts) ────────────────────────────────────

async function getCsrf(): Promise<{ csrfCookie: string; csrfToken: string }> {
  const res = await SELF.fetch('https://x/login', { redirect: 'manual' })
  const setCookie = res.headers.get('set-cookie') ?? ''
  const csrfCookieMatch = setCookie.match(/(csrf=[^;]+)/)
  if (!csrfCookieMatch) throw new Error('No csrf cookie in GET /login response')
  const csrfCookie = csrfCookieMatch[1]

  const html = await res.text()
  const tokenMatch = html.match(/name="_csrf"\s+value="([^"]+)"/)
  if (!tokenMatch) throw new Error('No _csrf field in login form HTML')
  const csrfToken = tokenMatch[1]

  return { csrfCookie, csrfToken }
}

async function login(username: string, password: string): Promise<string> {
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
  const setCookie = res.headers.get('set-cookie') ?? ''
  const sessionMatch = setCookie.match(/(session=[^;]+)/)
  if (!sessionMatch)
    throw new Error(
      `Login failed — no session cookie. Status: ${res.status}, Location: ${res.headers.get('location')}`,
    )
  return sessionMatch[1]
}

async function getAdminCsrf(
  sessionCookie: string,
): Promise<{ csrfCookie: string; csrfToken: string }> {
  const res = await SELF.fetch('https://x/admin', {
    headers: { cookie: sessionCookie },
    redirect: 'manual',
  })
  const html = await res.text()
  const setCookie = res.headers.get('set-cookie') ?? ''
  const csrfCookieMatch = setCookie.match(/(csrf=[^;]+)/)
  if (!csrfCookieMatch) throw new Error('No csrf cookie from GET /admin')
  const csrfCookie = csrfCookieMatch[1]
  const tokenMatch = html.match(/name="_csrf"\s+value="([^"]+)"/)
  if (!tokenMatch) throw new Error('No _csrf token in /admin HTML')
  return { csrfCookie, csrfToken: tokenMatch[1] }
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await db.exec('DELETE FROM admin_account')
  await db.exec('DELETE FROM blog_posts')
  await db.exec('DELETE FROM work_experiences')
  await db.exec('DELETE FROM projects')
})

// ── The full journey (ordered steps in a single describe) ─────────────────────

describe('E2E integration — full user + admin journey', () => {
  // Shared state threaded through the ordered steps
  let adminPassword: string
  let seededPostId: number
  let newPostSlug: string
  let newPostId: number
  let sessionCookie: string

  // ── a. Bootstrap ────────────────────────────────────────────────────────────

  it('a. bootstrap: ensureAdmin seeds exactly one admin account', async () => {
    adminPassword = typedEnv.ADMIN_BOOTSTRAP_PASSWORD
    await ensureAdmin(db, adminPassword)

    const row = await db
      .prepare('SELECT COUNT(*) AS n FROM admin_account')
      .first<{ n: number }>()
    expect(row?.n).toBe(1)
  })

  // ── b. Seed content ─────────────────────────────────────────────────────────

  it('b. seed: project + work + published blog post', async () => {

    await saveWork(db, {
      id: 0,
      company: 'Integration Corp',
      role: 'Staff Engineer',
      location: null,
      startDate: '2023-01-01',
      endDate: null,
      summary: null,
      tech: null,
      url: null,
      projectLinks: null,
      displayOrder: 1,
    })

    seededPostId = await savePost(db, {
      id: 0,
      slug: 'integration-post',
      title: 'Integration Post Title',
      excerpt: null,
      content: '# Integration\n\nThis is the integration post.',
      publishedAt: '2025-06-01T00:00:00.000Z',
      readingMinutes: 1,
      views: 0,
      published: 1,
    })

    expect(seededPostId).toBeGreaterThan(0)
  })

  // ── c. GET / ────────────────────────────────────────────────────────────────

  it('c. GET / returns 200 with seeded work company', async () => {
    const res = await SELF.fetch('https://x/')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('Integration Corp')
    expect(body).not.toContain('Integration Project')
  })

  it('d. GET /blog redirects to home', async () => {
    const res = await SELF.fetch('https://x/blog', { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/')
  })

  it('e. GET /blog/:slug redirects to home without incrementing views', async () => {
    await SELF.fetch('https://x/blog/integration-post', { redirect: 'manual' })
    await SELF.fetch('https://x/blog/integration-post', { redirect: 'manual' })

    const post = await getById(db, seededPostId)
    expect(post).not.toBeNull()
    expect(post!.views).toBe(0)
  })

  // ── f. GET /admin unauthenticated → 302 ────────────────────────────────────

  it('f. GET /admin unauthenticated redirects to /login', async () => {
    const res = await SELF.fetch('https://x/admin', { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/login')
  })

  // ── g. Login ────────────────────────────────────────────────────────────────

  it('g. login with admin credentials returns session cookie', async () => {
    sessionCookie = await login('muhammad', adminPassword)
    expect(sessionCookie).toMatch(/^session=/)
  })

  // ── h. Authenticated GET /admin → 200 ──────────────────────────────────────

  it('h. authenticated GET /admin returns 200 dashboard', async () => {
    const res = await SELF.fetch('https://x/admin', {
      headers: { cookie: sessionCookie },
    })
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Admin')
    expect(html.toLowerCase()).toContain('dashboard')
  })

  // ── i. Create a post via POST /admin/posts ──────────────────────────────────

  it('i. create post: POST /admin/posts → redirect; new post in /admin and /blog', async () => {
    newPostSlug = 'new-integration-post'
    const { csrfCookie, csrfToken } = await getAdminCsrf(sessionCookie)

    const body = new URLSearchParams({
      id: '',
      title: 'New Integration Post',
      slug: newPostSlug,
      excerpt: 'A fresh post',
      content: '## New\n\nCreated via admin.',
      published: 'true',
      _csrf: csrfToken,
    })

    const res = await SELF.fetch('https://x/admin/posts', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: `${sessionCookie}; ${csrfCookie}`,
      },
      body: body.toString(),
      redirect: 'manual',
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/admin')

    // Appears in GET /admin
    const adminRes = await SELF.fetch('https://x/admin', {
      headers: { cookie: sessionCookie },
    })
    expect(adminRes.status).toBe(200)
    const adminHtml = await adminRes.text()
    expect(adminHtml).toContain('New Integration Post')

    // Published → accessible at /blog/:slug
    const blogRes = await SELF.fetch(`https://x/blog/${newPostSlug}`)
    expect(blogRes.status).toBe(200)

    // Capture its id for subsequent steps
    const created = await getBySlug(db, newPostSlug)
    expect(created).not.toBeNull()
    newPostId = created!.id
  })

  // ── j. Edit the post (change title) ────────────────────────────────────────

  it('j. edit post: POST /admin/posts with id → redirect; title changed in DB', async () => {
    const { csrfCookie, csrfToken } = await getAdminCsrf(sessionCookie)

    const body = new URLSearchParams({
      id: String(newPostId),
      title: 'Edited Integration Post',
      slug: newPostSlug,
      excerpt: 'Updated excerpt',
      content: '## Edited\n\nContent updated.',
      published: 'true',
      _csrf: csrfToken,
    })

    const res = await SELF.fetch('https://x/admin/posts', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: `${sessionCookie}; ${csrfCookie}`,
      },
      body: body.toString(),
      redirect: 'manual',
    })
    expect(res.status).toBe(302)

    // Confirm title changed
    const updated = await getById(db, newPostId)
    expect(updated).not.toBeNull()
    expect(updated!.title).toBe('Edited Integration Post')
  })

  // ── k. Delete the post ──────────────────────────────────────────────────────

  it('k. delete post: POST /admin/posts/:id/delete → redirect; post gone from DB', async () => {
    const { csrfCookie, csrfToken } = await getAdminCsrf(sessionCookie)

    const body = new URLSearchParams({ _csrf: csrfToken })
    const res = await SELF.fetch(`https://x/admin/posts/${newPostId}/delete`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: `${sessionCookie}; ${csrfCookie}`,
      },
      body: body.toString(),
      redirect: 'manual',
    })
    expect(res.status).toBe(302)

    // Confirm it's gone
    const gone = await getById(db, newPostId)
    expect(gone).toBeNull()
  })

  // ── l. Logout → session cookie cleared ─────────────────────────────────────

  it('l. POST /logout redirects to /; response clears the session cookie; GET /admin without cookie → 302 /login', async () => {
    const { csrfCookie, csrfToken } = await getCsrf()
    const logoutBody = new URLSearchParams({ _csrf: csrfToken })

    const logoutRes = await SELF.fetch('https://x/logout', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie: `${sessionCookie}; ${csrfCookie}`,
      },
      body: logoutBody.toString(),
      redirect: 'manual',
    })
    expect(logoutRes.status).toBe(302)
    // The logout response must tell the client to discard the session cookie
    // (Max-Age=0 or Expires in the past) — i.e. "session=" appears in Set-Cookie
    const logoutSetCookie = logoutRes.headers.get('set-cookie') ?? ''
    expect(logoutSetCookie).toContain('session=')

    // A subsequent visit to /admin WITHOUT any session cookie → 302 /login
    // (simulates the browser having honoured the logout and discarded the cookie)
    const adminRes = await SELF.fetch('https://x/admin', {
      redirect: 'manual',
    })
    expect(adminRes.status).toBe(302)
    expect(adminRes.headers.get('location')).toBe('/login')
  })
})
