/**
 * Render tests for admin page components (Task 12).
 *
 * Each component is rendered via a tiny in-test Hono app so the JSX pragma
 * (hono/jsx) is exercised in the same way it will be used in production.
 */
import { Hono } from 'hono'
import { describe, it, expect } from 'vitest'
import type { SiteProfile, WorkExperience, BlogPost } from '../src/types'
import { Dashboard } from '../src/views/admin/Dashboard'
import { PostForm } from '../src/views/admin/PostForm'
import { WorkForm } from '../src/views/admin/WorkForm'
import { ProfileForm } from '../src/views/admin/ProfileForm'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CSRF = 'TESTTOKEN'

const owner: SiteProfile = {
  name: 'Muhammad Gulomov',
  handle: 'muhammad-gulomov',
  tagline: 'Software engineer.',
  location: 'Tashkent · UZ',
  email: 'test@example.com',
  github: 'https://github.com/muh',
  linkedin: 'https://linkedin.com/in/muh',
  telegram: 'https://t.me/muh',
  instagram: 'https://instagram.com/muh',
  photoPath: null,
}

const posts: BlogPost[] = [
  {
    id: 1,
    slug: 'first-post',
    title: 'First Post',
    excerpt: 'An excerpt.',
    content: '# First Post',
    publishedAt: '2026-01-15T00:00:00Z',
    readingMinutes: 3,
    views: 42,
    published: 1,
  },
  {
    id: 2,
    slug: 'draft-post',
    title: 'Draft Post',
    excerpt: null,
    content: '# Draft',
    publishedAt: '2026-02-01T00:00:00Z',
    readingMinutes: 1,
    views: 0,
    published: 0,
  },
]

const work: WorkExperience[] = [
  {
    id: 1,
    company: 'Yodla',
    role: 'Full-stack Engineer',
    location: 'Tashkent',
    startDate: '2024-01-01',
    endDate: null,
    summary: 'Built the platform.',
    tech: 'NestJS, React',
    url: 'https://yodla.uz',
    projectLinks: null,
    displayOrder: 1,
  },
]


// ─── Dashboard ────────────────────────────────────────────────────────────────

describe('Dashboard', () => {
  async function render(body: unknown) {
    const app = new Hono()
    app.get('/d', (c) => c.html(body as string))
    const res = await app.request('/d')
    return res.text()
  }

  it('renders the toolbar with Profile & settings, View site, Log out', async () => {
    const html = await render(
      <Dashboard posts={posts} work={work} csrf={CSRF} />
    )
    expect(html).toContain('Profile')
    expect(html).toContain('settings')
    expect(html).toContain('View site')
    expect(html).toContain('Log out')
  })

  it('logout form posts to /logout with _csrf', async () => {
    const html = await render(
      <Dashboard posts={posts} work={work} csrf={CSRF} />
    )
    expect(html).toContain('action="/logout"')
    expect(html).toContain('method="post"')
    expect(html).toContain(`value="${CSRF}"`)
  })

  it('renders each post with title, View/Edit links and delete form', async () => {
    const html = await render(
      <Dashboard posts={posts} work={work} csrf={CSRF} />
    )
    expect(html).toContain('First Post')
    expect(html).toContain('Draft Post')
    // View link to blog post
    expect(html).toContain('/blog/first-post')
    // Edit link
    expect(html).toContain('/admin/posts/1/edit')
    // Delete form
    expect(html).toContain('action="/admin/posts/1/delete"')
    expect(html).toContain("return confirm(&#39;Delete this post?&#39;)")
  })

  it('renders published / draft badges correctly', async () => {
    const html = await render(
      <Dashboard posts={posts} work={work} csrf={CSRF} />
    )
    expect(html).toContain('class="pub"')
    expect(html).toContain('class="draft"')
  })

  it('renders work entry with edit and delete', async () => {
    const html = await render(
      <Dashboard posts={posts} work={work} csrf={CSRF} />
    )
    expect(html).toContain('Full-stack Engineer')
    expect(html).toContain('Yodla')
    expect(html).toContain('/admin/work/1/edit')
    expect(html).toContain('action="/admin/work/1/delete"')
    expect(html).toContain("return confirm(&#39;Delete this entry?&#39;)")
  })

  it('every delete form contains the csrf token', async () => {
    const html = await render(
      <Dashboard posts={posts} work={work} csrf={CSRF} />
    )
    // Count occurrences of CSRF token — should appear in every form
    const matches = html.match(new RegExp(`value="${CSRF}"`, 'g'))
    // logout + 1 post delete + 1 work delete = 3
    expect(matches).not.toBeNull()
    expect(matches!.length).toBeGreaterThanOrEqual(4)
  })

  it('shows empty-state text when lists are empty', async () => {
    const html = await render(
      <Dashboard posts={[]} work={[]} csrf={CSRF} />
    )
    expect(html).toContain('No posts yet')
    expect(html).toContain('No entries yet')
  })

  it('new form: fields are empty / unchecked', async () => {
    const html = await render(<PostForm post={null} csrf={CSRF} />)
    // title value empty
    expect(html).toContain('name="title"')
    // hidden id empty
    expect(html).toContain('name="id"')
    // published checkbox not checked
    expect(html).not.toContain('checked=""')
    expect(html).not.toContain('checked=')
    // Shows "New post." heading
    expect(html).toContain('New post.')
  })

  it('edit form: prefills title, slug, content and checks published', async () => {
    const post: BlogPost = {
      id: 5,
      slug: 'my-slug',
      title: 'My Title',
      excerpt: 'My excerpt.',
      content: 'My content here.',
      publishedAt: '2026-03-01T00:00:00Z',
      readingMinutes: 2,
      views: 10,
      published: 1,
    }
    const html = await render(<PostForm post={post} csrf={CSRF} />)
    expect(html).toContain('value="5"')   // hidden id
    expect(html).toContain('value="My Title"')
    expect(html).toContain('value="my-slug"')
    expect(html).toContain('My content here.')
    expect(html).toContain('My excerpt.')
    expect(html).toContain('checked')   // published checkbox
    expect(html).toContain('Edit post.')
  })

  it('edit form: published=0 does not check the checkbox', async () => {
    const post: BlogPost = {
      id: 6,
      slug: 'unpublished',
      title: 'Draft Title',
      excerpt: null,
      content: 'Draft content.',
      publishedAt: '2026-04-01T00:00:00Z',
      readingMinutes: 1,
      views: 0,
      published: 0,
    }
    const html = await render(<PostForm post={post} csrf={CSRF} />)
    expect(html).not.toContain('checked')
  })
})

// ─── WorkForm ─────────────────────────────────────────────────────────────────

describe('WorkForm', () => {
  async function render(body: unknown) {
    const app = new Hono()
    app.get('/wf', (c) => c.html(body as string))
    const res = await app.request('/wf')
    return res.text()
  }

  it('new form: action=/admin/work, method=post, hidden _csrf', async () => {
    const html = await render(<WorkForm work={null} csrf={CSRF} />)
    expect(html).toContain('action="/admin/work"')
    expect(html).toContain('method="post"')
    expect(html).toContain('name="_csrf"')
    expect(html).toContain(`value="${CSRF}"`)
    expect(html).toContain('New experience.')
  })

  it('edit form: date inputs get YYYY-MM-DD values', async () => {
    const w: WorkExperience = {
      id: 3,
      company: 'Acme',
      role: 'Engineer',
      location: 'Remote',
      startDate: '2023-06-01T00:00:00.000Z',
      endDate: '2024-12-31T00:00:00.000Z',
      summary: 'Did stuff.',
      tech: 'Java',
      url: null,
      projectLinks: null,
      displayOrder: 2,
    }
    const html = await render(<WorkForm work={w} csrf={CSRF} />)
    expect(html).toContain('value="2023-06-01"')
    expect(html).toContain('value="2024-12-31"')
  })

  it('date inputs with plain YYYY-MM-DD values remain unchanged', async () => {
    const w: WorkExperience = {
      id: 4,
      company: 'Corp',
      role: 'Dev',
      location: null,
      startDate: '2022-01-15',
      endDate: null,
      summary: null,
      tech: null,
      url: null,
      projectLinks: null,
      displayOrder: 1,
    }
    const html = await render(<WorkForm work={w} csrf={CSRF} />)
    expect(html).toContain('value="2022-01-15"')
    // endDate empty when null
    expect(html).toContain('name="endDate"')
  })

  it('renders all required fields', async () => {
    const html = await render(<WorkForm work={null} csrf={CSRF} />)
    expect(html).toContain('name="role"')
    expect(html).toContain('name="company"')
    expect(html).toContain('name="location"')
    expect(html).toContain('name="url"')
    expect(html).toContain('name="startDate"')
    expect(html).toContain('name="endDate"')
    expect(html).toContain('name="tech"')
    expect(html).toContain('name="projectLinks"')
    expect(html).toContain('name="summary"')
    expect(html).toContain('name="displayOrder"')
  })
})

describe('ProfileForm', () => {
  async function render(body: unknown) {
    const app = new Hono()
    app.get('/prof', (c) => c.html(body as string))
    const res = await app.request('/prof')
    return res.text()
  }

  it('main form: action=/admin/profile, method=post, enctype=multipart/form-data', async () => {
    const html = await render(
      <ProfileForm profile={owner} accountUsername="admin" csrf={CSRF} />
    )
    expect(html).toContain('action="/admin/profile"')
    expect(html).toContain('method="post"')
    expect(html).toContain('enctype="multipart/form-data"')
  })

  it('has a photo file input accepting image/*', async () => {
    const html = await render(
      <ProfileForm profile={owner} accountUsername="admin" csrf={CSRF} />
    )
    expect(html).toContain('type="file"')
    expect(html).toContain('name="photo"')
    expect(html).toContain('accept="image/*"')
  })

  it('has a separate /admin/account form with username and password', async () => {
    const html = await render(
      <ProfileForm profile={owner} accountUsername="admin" csrf={CSRF} />
    )
    expect(html).toContain('action="/admin/account"')
    expect(html).toContain('name="username"')
    expect(html).toContain('value="admin"')
    expect(html).toContain('name="password"')
    expect(html).toContain('type="password"')
  })

  it('both forms contain the csrf token', async () => {
    const html = await render(
      <ProfileForm profile={owner} accountUsername="admin" csrf={CSRF} />
    )
    const matches = html.match(new RegExp(`value="${CSRF}"`, 'g'))
    // profile form + account form + logout form = at least 3 occurrences
    expect(matches).not.toBeNull()
    expect(matches!.length).toBeGreaterThanOrEqual(3)
  })

  it('prefills profile fields from the owner object', async () => {
    const html = await render(
      <ProfileForm profile={owner} accountUsername="theadmin" csrf={CSRF} />
    )
    expect(html).toContain('value="Muhammad Gulomov"')
    expect(html).toContain('value="muhammad-gulomov"')
    expect(html).toContain('value="theadmin"')
    expect(html).toContain('value="test@example.com"')
  })

  it('shows photoError when provided', async () => {
    const html = await render(
      <ProfileForm
        profile={owner}
        accountUsername="admin"
        csrf={CSRF}
        photoError="File too large"
      />
    )
    expect(html).toContain('File too large')
    expect(html).toContain('login-alert')
  })

  it('does not render photoError element when not provided', async () => {
    const html = await render(
      <ProfileForm profile={owner} accountUsername="admin" csrf={CSRF} />
    )
    expect(html).not.toContain('login-alert')
  })

  it('shows "No photo yet" when photoPath is null', async () => {
    const html = await render(
      <ProfileForm profile={owner} accountUsername="admin" csrf={CSRF} />
    )
    expect(html).toContain('No photo yet')
  })

  it('renders photo img when photoPath is set', async () => {
    const ownerWithPhoto: SiteProfile = { ...owner, photoPath: '/media/photo.jpg' }
    const html = await render(
      <ProfileForm profile={ownerWithPhoto} accountUsername="admin" csrf={CSRF} />
    )
    expect(html).toContain('src="/media/photo.jpg"')
    expect(html).not.toContain('No photo yet')
  })

  it('renders all profile social/link fields', async () => {
    const html = await render(
      <ProfileForm profile={owner} accountUsername="admin" csrf={CSRF} />
    )
    expect(html).toContain('name="github"')
    expect(html).toContain('name="linkedin"')
    expect(html).toContain('name="telegram"')
    expect(html).toContain('name="instagram"')
    expect(html).toContain('name="tagline"')
    expect(html).toContain('name="location"')
    expect(html).toContain('name="handle"')
  })
})
