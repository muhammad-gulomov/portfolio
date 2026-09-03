import { Hono } from 'hono'
import { describe, it, expect, beforeEach } from 'vitest'
import type { SiteProfile, WorkExperience, Vars } from '../src/types'
import { t as translate } from '../src/i18n/messages'
import { Home } from '../src/views/pages/Home'
import { BlogList } from '../src/views/pages/BlogList'
import { BlogPost as BlogPostPage } from '../src/views/pages/BlogPost'
import { Login } from '../src/views/pages/Login'
import LayoutMiddleware, { clearCssCache } from '../src/views/Layout'

const t = (key: string, ...args: (string | number)[]) => translate('en', key, ...args)
const lang = 'en' as const

const owner: SiteProfile = {
  name: 'Muhammad Gulomov',
  handle: '@muh',
  tagline: 'Software engineer in Tashkent.',
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
    role: 'Software Engineer',
    location: 'Tashkent',
    startDate: '2024-01',
    endDate: null,
    summary: 'Driving-school app, ~500k users.',
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

describe('DOCTYPE emission', () => {
  it('Layout middleware prepends <!DOCTYPE html> to rendered pages', async () => {
    // Typed explicitly rather than letting hono infer Variables from whichever
    // keys Layout happens to read — that inference silently narrows when the
    // layout changes, which is a property of the test, not of the app.
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

describe('Layout stylesheet inlining', () => {
  // The cache outlives a single test the way it outlives a single request.
  beforeEach(() => clearCssCache())

  const boot = (c: any) => {
    c.set('owner', owner); c.set('currentYear', 2026)
    c.set('lang', lang); c.set('t', t)
  }

  it('inlines the stylesheets and emits no blocking <link> when ASSETS resolves', async () => {
    const app = new Hono<{ Variables: Vars }>()
    app.use('*', async (c, next) => {
      // Stand-in for the Workers ASSETS binding.
      ;(c as any).env = {
        ASSETS: {
          fetch: async (url: URL) =>
            new Response(`/* ${url.pathname} */ .x{color:red}`, { status: 200 }),
        },
      }
      await next()
    })
    app.use('*', LayoutMiddleware)
    app.get('/t', (c) => { boot(c); return c.render(<p>x</p>, { title: 'T', css: 'home' }) })

    const body = await (await app.request('/t')).text()

    expect(body).toContain('<style>')
    expect(body).toContain('/css/base.css */')
    expect(body).toContain('/css/home.css */')      // page sheet appended after base
    expect(body).not.toContain('rel="stylesheet"')  // nothing left to block render
  })

  it('renders the name as the topbar brand, as an h1 only on the home page', async () => {
    const build = async (css?: string) => {
      const app = new Hono<{ Variables: Vars }>()
      app.use('*', LayoutMiddleware)
      app.get('/t', (c) => { boot(c); return c.render(<p>x</p>, { title: 'T', css }) })
      return (await app.request('/t')).text()
    }

    const home = await build('home')
    expect(home).toContain('<h1 class="brand"><a href="/">Muhammad Gulomov</a></h1>')

    // Admin keeps its own h1, so the brand must not compete for it there.
    const admin = await build('admin')
    expect(admin).toContain('<span class="brand"><a href="/">Muhammad Gulomov</a></span>')
    expect(admin).not.toContain('<h1 class="brand"')
  })

  it('falls back to <link> when the asset fetch fails', async () => {
    const app = new Hono<{ Variables: Vars }>()
    app.use('*', async (c, next) => {
      ;(c as any).env = {
        ASSETS: { fetch: async () => new Response('nope', { status: 500 }) },
      }
      await next()
    })
    app.use('*', LayoutMiddleware)
    app.get('/t', (c) => { boot(c); return c.render(<p>x</p>, { title: 'T', css: 'home' }) })

    const body = await (await app.request('/t')).text()

    // Degrades to the previous behaviour rather than an unstyled page.
    expect(body).toContain('rel="stylesheet"')
    expect(body).toContain('/css/base.css')
    expect(body).toContain('/css/home.css')
    expect(body).not.toContain('<style>')
  })
})

describe('Home', () => {
  const render = async (w: WorkExperience[], periods: Record<number, string>) => {
    const app = new Hono()
    app.get('/h', (c) =>
      c.html(
        <Home
          owner={owner}
          work={w}
          workPeriods={periods}
          t={t}
          lang={lang}
          currentYear={2026}
        />,
      ),
    )
    const res = await app.request('/h')
    return res.text()
  }

  it('renders the intro and the work ledger', async () => {
    const body = await render(work, workPeriods)

    expect(body).toContain('id="work"')
    expect(body).not.toContain('id="projects"')
    expect(body).not.toContain('id="blog"')

    // Intro is two first-person paragraphs beside the portrait; the name
    // itself is the topbar brand, rendered by Layout rather than by Home.
    // Apostrophes arrive HTML-escaped, so assert on a clause without one.
    expect(body).toContain('builds products end to end')
    expect(body.match(/class="lede"/g) ?? []).toHaveLength(2)
    expect(body).toContain('class="intro"')

    // The intro names three products and each is a real link — rendered
    // through raw(), so a regression to escaped text would show up here.
    expect(body).toContain('<a href="https://yodla-app.uz"')
    expect(body).toContain('<a href="https://avtodars-avtomaktab.uz"')
    expect(body).toContain('<a href="https://birga-app.uz"')
    expect(body).not.toContain('&lt;a href')

    expect(body).toContain('Yodla')
    expect(body).toContain('Tenzorsoft')
    expect(body).toContain('Jan 2024 — ')
    expect(body).toContain('Jun 2022 — Dec 2023')
  })

  it('shows only company, role, dates and summary — no project-links row', async () => {
    // The Tenzorsoft fixture carries projectLinks; the ledger must ignore it,
    // because only some rows have any and an extra line on those rows alone
    // made the whole list ragged.
    const body = await render(work, workPeriods)
    expect(body).not.toContain('class="links"')
    expect(body).not.toContain('luvi.uz')
    expect(body).toContain('class="summary"')
    expect(body).toContain('class="company"')
  })

  it('accents only the terminal word of an open-ended period', async () => {
    const body = await render(work, workPeriods)

    // Yodla is open-ended (endDate null) → "Present" carries .now
    expect(body).toContain('<span class="now">Present</span>')
    // Tenzorsoft ended → its period is plain text, no .now span
    expect(body).not.toContain('<span class="now">Dec 2023</span>')
    expect(body.match(/class="now"/g) ?? []).toHaveLength(1)
  })

  it('groups contacts as reach-me then find-me, in that order', async () => {
    const body = await render(work, workPeriods)

    // Two groups, so the spacing between them can carry the grouping.
    expect(body.match(/<span class="group">/g) ?? []).toHaveLength(2)

    const at = (label: string) => body.indexOf(`<span class="label">${label}</span>`)
    // reach: direct contact first
    expect(at('Telegram')).toBeLessThan(at('Email'))
    expect(at('Email')).toBeLessThan(at('GitHub'))
    // find: most professional to least
    expect(at('GitHub')).toBeLessThan(at('LinkedIn'))
    expect(at('LinkedIn')).toBeLessThan(at('Instagram'))
  })

  it('drops an empty group rather than leaving a gap', async () => {
    const app = new Hono()
    app.get('/h', (c) =>
      c.html(
        <Home
          owner={{ ...owner, github: '', linkedin: '', instagram: '' }}
          work={work}
          workPeriods={workPeriods}
          t={t}
          lang={lang}
          currentYear={2026}
        />,
      ),
    )
    const body = await (await app.request('/h')).text()
    expect(body.match(/<span class="group">/g) ?? []).toHaveLength(1)
    expect(body).toContain('<span class="label">Telegram</span>')
  })

  it('renders every contact channel exactly once', async () => {
    const body = await render(work, workPeriods)

    for (const label of ['Telegram', 'Email', 'GitHub', 'LinkedIn', 'Instagram']) {
      expect(body).toContain(`<span class="label">${label}</span>`)
    }
    // Each channel carries its own inline mark, not a shared placeholder.
    expect(body.match(/<svg /g) ?? []).toHaveLength(5)
    expect(body).toContain('href="mailto:test@example.com"')
    expect(body).toContain('href="https://github.com/muh"')
    expect(body).toContain('href="https://instagram.com/muh"')
  })

  it('omits a contact whose profile field is blank', async () => {
    const app = new Hono()
    app.get('/h', (c) =>
      c.html(
        <Home
          owner={{ ...owner, linkedin: '', instagram: '   ' }}
          work={work}
          workPeriods={workPeriods}
          t={t}
          lang={lang}
          currentYear={2026}
        />,
      ),
    )
    const body = await (await app.request('/h')).text()

    expect(body).toContain('<span class="label">GitHub</span>')
    expect(body).not.toContain('<span class="label">LinkedIn</span>')
    expect(body).not.toContain('<span class="label">Instagram</span>')
    expect(body.match(/<svg /g) ?? []).toHaveLength(3)
  })

  it('gives a scheme-less profile value an absolute href', async () => {
    const app = new Hono()
    app.get('/h', (c) =>
      c.html(
        <Home
          owner={{ ...owner, github: 'github.com/bare' }}
          work={[]}
          workPeriods={{}}
          t={t}
          lang={lang}
          currentYear={2026}
        />,
      ),
    )
    const body = await (await app.request('/h')).text()
    expect(body).toContain('href="https://github.com/bare"')
  })

  it('renders the portrait with intrinsic dimensions when a photo is set', async () => {
    const app = new Hono()
    app.get('/h', (c) =>
      c.html(
        <Home
          owner={{ ...owner, photoPath: '/img/portrait.webp' }}
          work={work}
          workPeriods={workPeriods}
          t={t}
          lang={lang}
          currentYear={2026}
        />,
      ),
    )
    const body = await (await app.request('/h')).text()

    expect(body).toContain('class="portrait"')
    expect(body).toContain('src="/img/portrait.webp"')
    expect(body).toContain('alt="Portrait of Muhammad Gulomov"')
    // width/height reserve the box so the masthead does not reflow on load.
    expect(body).toContain('width="520"')
    expect(body).toContain('height="694"')
    // Above the fold on every breakpoint, so it must not be lazy.
    expect(body).not.toContain('loading="lazy"')
  })

  it('omits the portrait entirely when no photo is set', async () => {
    const body = await render(work, workPeriods)
    expect(body).not.toContain('class="portrait"')
    expect(body).not.toContain('<img')
  })

  it('renders empty-state when no work', async () => {
    const body = await render([], {})
    expect(body).toContain('Nothing here yet')
  })
})

describe('BlogList', () => {
  it('renders each post title and excerpt', async () => {
    const latestPosts = [
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
    ]
    const app = new Hono()
    app.get('/bl', (c) => c.html(<BlogList posts={latestPosts} t={t} lang={lang} />))
    const res = await app.request('/bl')
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('First Post')
  })
})

describe('BlogPost', () => {
  it('renders post title and raw body HTML', async () => {
    const post = {
      id: 1,
      slug: 'first-post',
      title: 'First Post',
      excerpt: 'An excerpt.',
      content: '# First Post',
      publishedAt: '2026-01-15T00:00:00Z',
      readingMinutes: 3,
      views: 42,
      published: 1,
    }
    const bodyHtml = '<p>The body content with <strong>bold text</strong> inside.</p>'
    const app = new Hono()
    app.get('/bp', (c) =>
      c.html(<BlogPostPage owner={owner} post={post} bodyHtml={bodyHtml} t={t} lang={lang} />),
    )
    const res = await app.request('/bp')
    const body = await res.text()
    expect(body).toContain('First Post')
    expect(body).toContain('<strong>bold text</strong>')
  })
})

describe('Login', () => {
  it('renders standalone form posting to /login with _csrf hidden field', async () => {
    const app = new Hono()
    app.get('/login', (c) =>
      c.html(<Login owner={owner} csrf="test-csrf-token" t={t} lang={lang} />),
    )
    const res = await app.request('/login')
    const body = await res.text()
    expect(body).toContain('action="/login"')
    expect(body).toContain('name="_csrf"')
    expect(body).toContain('v2027u')
  })
})
