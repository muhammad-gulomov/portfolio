import { env } from 'cloudflare:workers'
import { SELF } from 'cloudflare:test'
import { describe, it, expect, beforeEach } from 'vitest'
import type { Env } from '../src/types'
import { saveWork } from '../src/db/work'
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
  it('returns 200 and contains work company name', async () => {
    await saveWork(db, {
      id: 0, company: 'Acme Corp', role: 'Engineer', location: null,
      startDate: '2022-01-01', endDate: null, summary: null, tech: null,
      url: null, projectLinks: null, displayOrder: 1,
    })

    const res = await SELF.fetch('https://x/')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('Acme Corp')
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

// ─── GET /sitemap.xml ──────────────────────────────────────────────────────────

describe('GET /sitemap.xml', () => {
  it('sitemap lists one URL with no language alternates', async () => {
    const res = await SELF.fetch('https://x/sitemap.xml')
    expect(res.status).toBe(200)
    const xml = await res.text()
    expect(xml).not.toContain('xhtml')
    expect(xml).not.toContain('hreflang')
    expect(xml).toContain('<loc>https://kanzen.uz/</loc>')
  })
})

// ─── GET /blog ────────────────────────────────────────────────────────────────

describe('GET /blog', () => {
  it('redirects to home', async () => {
    const res = await SELF.fetch('https://x/blog', { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/')
  })
})

describe('GET /blog/:slug', () => {
  it('redirects to home', async () => {
    const res = await SELF.fetch('https://x/blog/hello-world', { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/')
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
