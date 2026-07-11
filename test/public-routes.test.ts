import { env } from 'cloudflare:workers'
import { SELF } from 'cloudflare:test'
import { describe, it, expect, beforeEach } from 'vitest'
import type { Env } from '../src/types'
import { saveWork } from '../src/db/work'
import { saveProject } from '../src/db/project'
import { savePost, getById } from '../src/db/blog'
import { putPhoto } from '../src/media/photo'
import { updateProfile } from '../src/db/profile'
import { fmtPeriod } from '../src/routes/public'

const db = (env as unknown as Env).DB
const bucket = (env as unknown as Env).BUCKET

beforeEach(async () => {
  await db.exec('DELETE FROM work_experiences')
  await db.exec('DELETE FROM projects')
  await db.exec('DELETE FROM blog_posts')
  await db.exec('DELETE FROM site_profile')
  // clean R2 object
  await bucket.delete('profile-photo')
})

// ─── GET / ────────────────────────────────────────────────────────────────────

describe('GET /', () => {
  it('returns 200 and contains seeded project name', async () => {
    await saveProject(db, {
      id: 0, name: 'SuperApp', tagline: 'The best app', description: null,
      tech: 'TS', url: null, githubUrl: null, imageUrl: null, displayOrder: 1,
    })
    await saveWork(db, {
      id: 0, company: 'Acme Corp', role: 'Engineer', location: null,
      startDate: '2022-01-01', endDate: null, summary: null, tech: null,
      url: null, projectLinks: null, displayOrder: 1,
    })

    const res = await SELF.fetch('https://x/')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('SuperApp')
  })

  it('shows work period label for work entry', async () => {
    await saveWork(db, {
      id: 0, company: 'Acme Corp', role: 'Engineer', location: null,
      startDate: '2022-01-01', endDate: '2024-03-01', summary: null, tech: null,
      url: null, projectLinks: null, displayOrder: 1,
    })

    const res = await SELF.fetch('https://x/')
    expect(res.status).toBe(200)
    const body = await res.text()
    // Should contain formatted period like "Jan 2022" and "Mar 2024"
    expect(body).toContain('Jan 2022')
    expect(body).toContain('Mar 2024')
  })

  it('shows "Present" for open-ended work', async () => {
    await saveWork(db, {
      id: 0, company: 'Current Co', role: 'Dev', location: null,
      startDate: '2023-06-01', endDate: null, summary: null, tech: null,
      url: null, projectLinks: null, displayOrder: 1,
    })

    const res = await SELF.fetch('https://x/')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('Present')
  })

  it('renders owner name from DB profile (not fallback)', async () => {
    await updateProfile(db, {
      name: 'Test Owner FromDB',
      handle: 'testowner',
      tagline: 'Test tagline',
      location: 'Test City',
      email: 'test@example.com',
      github: 'testowner',
      linkedin: 'testowner',
      telegram: 'testowner',
      instagram: 'testowner',
      photoPath: null,
    })

    const res = await SELF.fetch('https://x/')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('Test Owner FromDB')
  })
})

// ─── GET /blog ────────────────────────────────────────────────────────────────

describe('GET /blog', () => {
  it('returns 200 and lists published post title', async () => {
    await savePost(db, {
      id: 0, slug: 'my-post', title: 'My First Post', excerpt: null,
      content: 'Hello world', publishedAt: '2025-01-01T00:00:00.000Z',
      readingMinutes: 1, views: 0, published: 1,
    })

    const res = await SELF.fetch('https://x/blog')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('My First Post')
  })

  it('does not list unpublished posts', async () => {
    await savePost(db, {
      id: 0, slug: 'draft-post', title: 'Draft Post', excerpt: null,
      content: 'Not yet', publishedAt: '2025-01-01T00:00:00.000Z',
      readingMinutes: 1, views: 0, published: 0,
    })

    const res = await SELF.fetch('https://x/blog')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).not.toContain('Draft Post')
  })
})

// ─── GET /blog/:slug ──────────────────────────────────────────────────────────

describe('GET /blog/:slug', () => {
  it('returns 200 for a published post', async () => {
    await savePost(db, {
      id: 0, slug: 'hello-world', title: 'Hello World', excerpt: null,
      content: '# Hello\n\nThis is content.', publishedAt: '2025-01-01T00:00:00.000Z',
      readingMinutes: 1, views: 0, published: 1,
    })

    const res = await SELF.fetch('https://x/blog/hello-world')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('Hello World')
  })

  it('increments views on successive visits', async () => {
    const postId = await savePost(db, {
      id: 0, slug: 'view-counter', title: 'View Counter', excerpt: null,
      content: 'Views test', publishedAt: '2025-01-01T00:00:00.000Z',
      readingMinutes: 1, views: 0, published: 1,
    })

    // First visit
    await SELF.fetch('https://x/blog/view-counter')
    // Second visit
    await SELF.fetch('https://x/blog/view-counter')

    const post = await getById(db, postId)
    expect(post).not.toBeNull()
    expect(post!.views).toBe(2)
  })

  it('returns 404 for an unpublished post', async () => {
    await savePost(db, {
      id: 0, slug: 'hidden-post', title: 'Hidden Post', excerpt: null,
      content: 'Secret', publishedAt: '2025-01-01T00:00:00.000Z',
      readingMinutes: 1, views: 0, published: 0,
    })

    const res = await SELF.fetch('https://x/blog/hidden-post')
    expect(res.status).toBe(404)
  })

  it('returns 404 for a nonexistent slug', async () => {
    const res = await SELF.fetch('https://x/blog/does-not-exist')
    expect(res.status).toBe(404)
  })
})

// ─── GET /media/profile-photo ─────────────────────────────────────────────────

describe('GET /media/profile-photo', () => {
  it('returns 404 when no R2 object exists', async () => {
    const res = await SELF.fetch('https://x/media/profile-photo')
    expect(res.status).toBe(404)
  })

  it('returns 200 with correct content-type after putPhoto', async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', { type: 'image/png' })
    await putPhoto(bucket, file)

    const res = await SELF.fetch('https://x/media/profile-photo')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
  })

  it('sets cache-control to immutable on photo response', async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', { type: 'image/png' })
    await putPhoto(bucket, file)

    const res = await SELF.fetch('https://x/media/profile-photo')
    const cc = res.headers.get('cache-control')
    expect(cc).toContain('immutable')
    expect(cc).toContain('max-age=31536000')
  })
})

// ─── fmtPeriod unit tests ─────────────────────────────────────────────────────

describe('fmtPeriod', () => {
  it('formats a start+end date as "Mon YYYY — Mon YYYY"', () => {
    expect(fmtPeriod('2022-01-15', '2024-03-01')).toBe('Jan 2022 — Mar 2024')
  })

  it('formats an open-ended period ending with "Present"', () => {
    expect(fmtPeriod('2023-06-01', null)).toBe('Jun 2023 — Present')
  })
})
