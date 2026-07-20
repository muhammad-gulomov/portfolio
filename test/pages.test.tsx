/**
 * Render smoke tests for public page components (Task 11).
 *
 * Each component is rendered via a tiny in-test Hono app so the JSX pragma
 * (hono/jsx) is exercised in the same way it will be used in production.
 */
import { Hono } from 'hono'
import { describe, it, expect } from 'vitest'
import type { SiteProfile, WorkExperience, Project, BlogPost, Vars } from '../src/types'
import { t as translate } from '../src/i18n/messages'
import { Home } from '../src/views/pages/Home'
import { BlogList } from '../src/views/pages/BlogList'
import { BlogPost as BlogPostPage } from '../src/views/pages/BlogPost'
import { Login } from '../src/views/pages/Login'
import LayoutMiddleware from '../src/views/Layout'

const t = (key: string, ...args: (string | number)[]) => translate('en', key, ...args)
const lang = 'en' as const

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const owner: SiteProfile = {
  name: 'Muhammad Gulomov',
  handle: '@muh',
  tagline: 'Software engineer. Builder of quiet systems.',
  location: 'Tashkent · UZ',
  email: 'test@example.com',
  github: 'https://github.com/muh',
  linkedin: 'https://linkedin.com/in/muh',
  telegram: 'https://t.me/muh',
  instagram: 'https://instagram.com/muh',
  photoPath: null,
}

const work: WorkExperience[] = [
  {
    id: 1,
    company: 'Yodla',
    role: 'Full-stack Engineer',
    location: 'Tashkent',
    startDate: '2024-01',
    endDate: null,
    summary: 'Built the platform.',
    tech: 'NestJS, React',
    url: 'https://yodla.uz',
    projectLinks: null,
    displayOrder: 1,
  },
  {
    id: 2,
    company: 'Tenzorsoft',
    role: 'Backend Developer',
    location: 'Remote',
    startDate: '2022-06',
    endDate: '2023-12',
    summary: null,
    tech: 'Java, Spring',
    url: null,
    projectLinks: 'https://luvi.uz, https://mycoal.uz',
    displayOrder: 2,
  },
]

const workPeriods: Record<number, string> = {
  1: 'Jan 2024 — Present',
  2: 'Jun 2022 — Dec 2023',
}

const projects: Project[] = [
  {
    id: 1,
    name: 'Yodla Platform',
    tagline: 'Driving-school education',
    description: 'Full platform for driving schools.',
    tech: 'NestJS, React Native',
    url: 'https://yodla.uz',
    githubUrl: null,
    imageUrl: null,
    displayOrder: 1,
  },
  {
    id: 2,
    name: 'Portfolio Edge',
    tagline: 'This site, on Cloudflare Workers',
    description: null,
    tech: 'Hono, D1',
    url: null,
    githubUrl: 'https://github.com/muh/portfolio',
    imageUrl: null,
    displayOrder: 2,
  },
]

const latestPosts: BlogPost[] = [
  {
    id: 1,
    slug: 'first-post',
    title: 'First Post',
    excerpt: 'An excerpt for the first post.',
    content: '# First Post',
    publishedAt: '2026-01-15T00:00:00Z',
    readingMinutes: 3,
    views: 42,
    published: 1,
  },
  {
    id: 2,
    slug: 'second-post',
    title: 'Second Post',
    excerpt: 'An excerpt for the second post.',
    content: '# Second Post',
    publishedAt: '2026-03-20T00:00:00Z',
    readingMinutes: 5,
    views: 10,
    published: 1,
  },
]

// ─── DOCTYPE ──────────────────────────────────────────────────────────────────

describe('DOCTYPE emission', () => {
  it('Layout middleware prepends <!DOCTYPE html> to rendered pages', async () => {
    const app = new Hono<{ Variables: Vars }>()
    app.use('*', LayoutMiddleware)
    app.get('/t', (c) => {
      c.set('owner', owner)
      c.set('currentYear', 2026)
      c.set('lang', lang)
      c.set('t', t)
      return c.render(<p>x</p>, { title: 'T' })
    })
    const res = await app.request('/t')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body.toLowerCase()).toMatch(/^<!doctype html>/)
  })

  it('Login standalone component starts with <!DOCTYPE html>', async () => {
    const app = new Hono()
    app.get('/login', (c) => c.html(<Login owner={owner} csrf="tok" t={t} lang={lang} />))
    const res = await app.request('/login')
    const body = await res.text()
    expect(body.toLowerCase()).toMatch(/^<!doctype html>/)
  })
})

// ─── Home ─────────────────────────────────────────────────────────────────────

describe('Home', () => {
  it('renders all required section ids and fixture data', async () => {
    const app = new Hono()
    app.get('/h', (c) =>
      c.html(
        <Home
          owner={owner}
          work={work}
          workPeriods={workPeriods}
          projects={projects}
          latestPosts={latestPosts}
          t={t}
          lang={lang}
        />,
      ),
    )
    const res = await app.request('/h')
    expect(res.status).toBe(200)
    const body = await res.text()

    // Section anchors
    expect(body).toContain('id="work"')
    expect(body).toContain('id="projects"')
    expect(body).toContain('id="about"')
    expect(body).toContain('id="blog"')

    // Work fixture data
    expect(body).toContain('Yodla')
    expect(body).toContain('Tenzorsoft')
    expect(body).toContain('Jan 2024 — Present')

    // Project fixture data
    expect(body).toContain('Yodla Platform')
    expect(body).toContain('Portfolio Edge')

    // Blog preview
    expect(body).toContain('First Post')
    expect(body).toContain('Second Post')

    // Hero structure
    expect(body).toContain('Muhammad')
    expect(body).toContain('Gulomov')
    expect(body).toContain('id="top"')

    // CTA section
    expect(body).toContain('worth building')
  })

  it('renders empty-state messages when no data', async () => {
    const app = new Hono()
    app.get('/empty', (c) =>
      c.html(
        <Home
          owner={owner}
          work={[]}
          workPeriods={{}}
          projects={[]}
          latestPosts={[]}
          t={t}
          lang={lang}
        />,
      ),
    )
    const res = await app.request('/empty')
    const body = await res.text()
    expect(body).toContain('experiences will land here soon')
    expect(body).toContain('workshop')
    expect(body).toContain('blank page is undefeated')
  })
})

// ─── BlogList ──────────────────────────────────────────────────────────────────

describe('BlogList', () => {
  it('renders each post title and excerpt', async () => {
    const app = new Hono()
    app.get('/bl', (c) => c.html(<BlogList posts={latestPosts} t={t} lang={lang} />))
    const res = await app.request('/bl')
    expect(res.status).toBe(200)
    const body = await res.text()

    expect(body).toContain('First Post')
    expect(body).toContain('Second Post')
    expect(body).toContain('An excerpt for the first post.')
    expect(body).toContain('/blog/first-post')
    expect(body).toContain('/blog/second-post')
    // Date format MMM dd · yyyy
    expect(body).toContain('Jan 15 · 2026')
  })

  it('renders empty-state when no posts', async () => {
    const app = new Hono()
    app.get('/empty', (c) => c.html(<BlogList posts={[]} t={t} lang={lang} />))
    const res = await app.request('/empty')
    const body = await res.text()
    expect(body).toContain('No posts published yet')
  })
})

// ─── BlogPost ─────────────────────────────────────────────────────────────────

describe('BlogPost', () => {
  it('renders post title, meta and raw body HTML', async () => {
    const post = latestPosts[0]
    const bodyHtml = '<p>The body content with <strong>bold text</strong> inside.</p>'

    const app = new Hono()
    app.get('/bp', (c) =>
      c.html(<BlogPostPage owner={owner} post={post} bodyHtml={bodyHtml} t={t} lang={lang} />),
    )
    const res = await app.request('/bp')
    expect(res.status).toBe(200)
    const body = await res.text()

    expect(body).toContain('First Post')
    // raw bodyHtml — the <strong> tag must appear unescaped
    expect(body).toContain('<strong>bold text</strong>')
    // Author name from owner
    expect(body).toContain('Muhammad Gulomov')
    // Date formatted as "January 15, 2026"
    expect(body).toContain('January 15, 2026')
    // Reading time
    expect(body).toContain('3 min read')
    // View count
    expect(body).toContain('42')
    // Back links
    expect(body).toContain('Back to blog')
    expect(body).toContain('/blog')
    // Reading progress bar
    expect(body).toContain('readingProgress')
  })
})

// ─── Login ────────────────────────────────────────────────────────────────────

describe('Login', () => {
  it('renders standalone form posting to /login with _csrf hidden field', async () => {
    const app = new Hono()
    app.get('/login', (c) =>
      c.html(<Login owner={owner} csrf="test-csrf-token" t={t} lang={lang} />),
    )
    const res = await app.request('/login')
    expect(res.status).toBe(200)
    const body = await res.text()

    // Full HTML document
    expect(body).toContain('<html')
    expect(body).toContain('</html>')
    expect(body).toContain('<head')

    // Form target and CSRF
    expect(body).toContain('action="/login"')
    expect(body).toContain('method="post"')
    expect(body).toContain('name="_csrf"')
    expect(body).toContain('value="test-csrf-token"')

    // Form fields
    expect(body).toContain('name="username"')
    expect(body).toContain('name="password"')

    // No topbar / footer from layout
    expect(body).not.toContain('class="topbar"')
    expect(body).not.toContain('class="site-footer"')

    // Standalone CSS
    expect(body).toContain('base.css')
    expect(body).toContain('admin.css')
    expect(body).toContain('Space+Grotesk')
    expect(body).toContain('#0b0e14')
    expect(body).toContain('v2026')
  })

  it('shows error message when error=true', async () => {
    const app = new Hono()
    app.get('/login-err', (c) =>
      c.html(<Login owner={owner} csrf="tok" t={t} lang={lang} error={true} />),
    )
    const res = await app.request('/login-err')
    const body = await res.text()
    expect(body).toContain('Incorrect username or password')
    expect(body).not.toContain('signed out')
  })

  it('shows logout message when logout=true', async () => {
    const app = new Hono()
    app.get('/login-out', (c) =>
      c.html(<Login owner={owner} csrf="tok" t={t} lang={lang} logout={true} />),
    )
    const res = await app.request('/login-out')
    const body = await res.text()
    // JSX escapes the apostrophe as &#39; in HTML output
    expect(body).toContain('You&#39;ve been signed out')
    expect(body).not.toContain('Incorrect username')
  })

  it('shows no alert when neither error nor logout', async () => {
    const app = new Hono()
    app.get('/login-clean', (c) =>
      c.html(<Login owner={owner} csrf="tok" t={t} lang={lang} />),
    )
    const res = await app.request('/login-clean')
    const body = await res.text()
    expect(body).not.toContain('Incorrect username')
    expect(body).not.toContain('signed out')
  })
})
