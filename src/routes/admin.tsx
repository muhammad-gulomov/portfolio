import { Hono } from 'hono'
import type { Env, Vars } from '../types'
import { requireAuth } from '../auth/guard'
import { issueCsrf, verifyCsrf } from '../auth/csrf'
import { getProfile, updateProfile, setPhotoPath } from '../db/profile'
import { getAccount, updateCredentials } from '../db/account'
import { listAll, getById, savePost, deletePost } from '../db/blog'
import { listWork, getWork, saveWork, deleteWork } from '../db/work'
import { listProjects, getProject, saveProject, deleteProject } from '../db/project'
import { putPhoto } from '../media/photo'
import { hashPassword } from '../auth/password'
import { Dashboard } from '../views/admin/Dashboard'
import { PostForm } from '../views/admin/PostForm'
import { WorkForm } from '../views/admin/WorkForm'
import { ProjectForm } from '../views/admin/ProjectForm'
import { ProfileForm } from '../views/admin/ProfileForm'
import { SEED_OWNER } from '../seed-owner'
import type { SiteProfile } from '../types'

const admin = new Hono<{ Bindings: Env; Variables: Vars }>()

// All admin routes require authentication
admin.use('/admin', requireAuth)
admin.use('/admin/*', requireAuth)

// ── Dashboard ─────────────────────────────────────────────────────────────────

admin.get('/admin', async (c) => {
  const [posts, work, projects, csrf] = await Promise.all([
    listAll(c.env.DB),
    listWork(c.env.DB),
    listProjects(c.env.DB),
    issueCsrf(c, c.env.SESSION_SECRET),
  ])
  return c.render(<Dashboard posts={posts} work={work} projects={projects} csrf={csrf} />, {
    title: 'Admin',
    css: 'admin',
  })
})

// ── Blog posts ────────────────────────────────────────────────────────────────

admin.get('/admin/posts/new', async (c) => {
  const csrf = await issueCsrf(c, c.env.SESSION_SECRET)
  return c.render(<PostForm post={null} csrf={csrf} />, { title: 'New post', css: 'admin' })
})

admin.get('/admin/posts/:id/edit', async (c) => {
  const id = Number(c.req.param('id'))
  const post = await getById(c.env.DB, id)
  if (!post) return c.notFound()
  const csrf = await issueCsrf(c, c.env.SESSION_SECRET)
  return c.render(<PostForm post={post} csrf={csrf} />, { title: 'Edit post', css: 'admin' })
})

admin.post('/admin/posts', async (c) => {
  if (!(await verifyCsrf(c, c.env.SESSION_SECRET))) return c.redirect('/admin')
  const body = await c.req.parseBody()
  const idRaw = typeof body.id === 'string' ? body.id.trim() : ''
  await savePost(c.env.DB, {
    id: idRaw ? Number(idRaw) : (undefined as unknown as number),
    title: typeof body.title === 'string' ? body.title : '',
    slug: typeof body.slug === 'string' ? body.slug : '',
    excerpt: typeof body.excerpt === 'string' ? body.excerpt : null,
    content: typeof body.content === 'string' ? body.content : '',
    published: body.published ? 1 : 0,
    publishedAt: '',
    readingMinutes: 0,
    views: 0,
  })
  return c.redirect('/admin')
})

admin.post('/admin/posts/:id/delete', async (c) => {
  if (!(await verifyCsrf(c, c.env.SESSION_SECRET))) return c.redirect('/admin')
  const id = Number(c.req.param('id'))
  await deletePost(c.env.DB, id)
  return c.redirect('/admin')
})

// ── Work experiences ──────────────────────────────────────────────────────────

admin.get('/admin/work/new', async (c) => {
  const csrf = await issueCsrf(c, c.env.SESSION_SECRET)
  return c.render(<WorkForm work={null} csrf={csrf} />, { title: 'New experience', css: 'admin' })
})

admin.get('/admin/work/:id/edit', async (c) => {
  const id = Number(c.req.param('id'))
  const work = await getWork(c.env.DB, id)
  if (!work) return c.notFound()
  const csrf = await issueCsrf(c, c.env.SESSION_SECRET)
  return c.render(<WorkForm work={work} csrf={csrf} />, { title: 'Edit experience', css: 'admin' })
})

admin.post('/admin/work', async (c) => {
  if (!(await verifyCsrf(c, c.env.SESSION_SECRET))) return c.redirect('/admin')
  const body = await c.req.parseBody()
  const idRaw = typeof body.id === 'string' ? body.id.trim() : ''
  const endDate = typeof body.endDate === 'string' && body.endDate.trim()
    ? body.endDate.trim()
    : null
  await saveWork(c.env.DB, {
    id: idRaw ? Number(idRaw) : (undefined as unknown as number),
    company: typeof body.company === 'string' ? body.company : '',
    role: typeof body.role === 'string' ? body.role : '',
    location: typeof body.location === 'string' && body.location.trim() ? body.location.trim() : null,
    startDate: typeof body.startDate === 'string' ? body.startDate : '',
    endDate,
    summary: typeof body.summary === 'string' && body.summary.trim() ? body.summary.trim() : null,
    tech: typeof body.tech === 'string' && body.tech.trim() ? body.tech.trim() : null,
    url: typeof body.url === 'string' && body.url.trim() ? body.url.trim() : null,
    projectLinks: typeof body.projectLinks === 'string' && body.projectLinks.trim() ? body.projectLinks.trim() : null,
    displayOrder: Number(body.displayOrder) || 0,
  })
  return c.redirect('/admin')
})

admin.post('/admin/work/:id/delete', async (c) => {
  if (!(await verifyCsrf(c, c.env.SESSION_SECRET))) return c.redirect('/admin')
  const id = Number(c.req.param('id'))
  await deleteWork(c.env.DB, id)
  return c.redirect('/admin')
})

// ── Projects ──────────────────────────────────────────────────────────────────

admin.get('/admin/projects/new', async (c) => {
  const csrf = await issueCsrf(c, c.env.SESSION_SECRET)
  return c.render(<ProjectForm project={null} csrf={csrf} />, { title: 'New project', css: 'admin' })
})

admin.get('/admin/projects/:id/edit', async (c) => {
  const id = Number(c.req.param('id'))
  const project = await getProject(c.env.DB, id)
  if (!project) return c.notFound()
  const csrf = await issueCsrf(c, c.env.SESSION_SECRET)
  return c.render(<ProjectForm project={project} csrf={csrf} />, { title: 'Edit project', css: 'admin' })
})

admin.post('/admin/projects', async (c) => {
  if (!(await verifyCsrf(c, c.env.SESSION_SECRET))) return c.redirect('/admin')
  const body = await c.req.parseBody()
  const idRaw = typeof body.id === 'string' ? body.id.trim() : ''
  await saveProject(c.env.DB, {
    id: idRaw ? Number(idRaw) : (undefined as unknown as number),
    name: typeof body.name === 'string' ? body.name : '',
    tagline: typeof body.tagline === 'string' && body.tagline.trim() ? body.tagline.trim() : null,
    description: typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null,
    tech: typeof body.tech === 'string' && body.tech.trim() ? body.tech.trim() : null,
    url: typeof body.url === 'string' && body.url.trim() ? body.url.trim() : null,
    githubUrl: typeof body.githubUrl === 'string' && body.githubUrl.trim() ? body.githubUrl.trim() : null,
    imageUrl: typeof body.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null,
    displayOrder: Number(body.displayOrder) || 0,
  })
  return c.redirect('/admin')
})

admin.post('/admin/projects/:id/delete', async (c) => {
  if (!(await verifyCsrf(c, c.env.SESSION_SECRET))) return c.redirect('/admin')
  const id = Number(c.req.param('id'))
  await deleteProject(c.env.DB, id)
  return c.redirect('/admin')
})

// ── Profile ───────────────────────────────────────────────────────────────────

admin.get('/admin/profile', async (c) => {
  const [profile, acct, csrf] = await Promise.all([
    getProfile(c.env.DB),
    getAccount(c.env.DB),
    issueCsrf(c, c.env.SESSION_SECRET),
  ])
  const resolvedProfile = profile ?? c.get('owner') ?? SEED_OWNER
  const accountUsername = acct?.username ?? 'muhammad'
  return c.render(
    <ProfileForm profile={resolvedProfile} accountUsername={accountUsername} csrf={csrf} />,
    { title: 'Profile & settings', css: 'admin' },
  )
})

admin.post('/admin/profile', async (c) => {
  if (!(await verifyCsrf(c, c.env.SESSION_SECRET))) return c.redirect('/admin/profile')
  const body = await c.req.parseBody()

  const str = (k: string) => typeof body[k] === 'string' ? (body[k] as string) : ''

  // Get current profile to preserve photoPath if no new photo uploaded
  const currentProfile = await getProfile(c.env.DB)
  const existingPhotoPath = currentProfile?.photoPath ?? null

  const profile: SiteProfile = {
    name: str('name'),
    handle: str('handle'),
    tagline: str('tagline'),
    location: str('location'),
    email: str('email'),
    github: str('github'),
    linkedin: str('linkedin'),
    telegram: str('telegram'),
    instagram: str('instagram'),
    photoPath: existingPhotoPath,
  }

  await updateProfile(c.env.DB, profile)

  // Handle optional photo upload
  const photo = body.photo
  if (photo instanceof File && photo.size > 0) {
    try {
      await putPhoto(c.env.BUCKET, photo)
      await setPhotoPath(c.env.DB, '/media/profile-photo?v=' + Date.now())
    } catch (e) {
      // Re-render with photo error; reload profile for current state
      const [freshProfile, acct, csrf] = await Promise.all([
        getProfile(c.env.DB),
        getAccount(c.env.DB),
        issueCsrf(c, c.env.SESSION_SECRET),
      ])
      return c.render(
        <ProfileForm
          profile={freshProfile ?? profile}
          accountUsername={acct?.username ?? 'muhammad'}
          csrf={csrf}
          photoError={(e as Error).message}
        />,
        { title: 'Profile & settings', css: 'admin' },
      )
    }
  }

  return c.redirect('/admin/profile')
})

admin.post('/admin/account', async (c) => {
  if (!(await verifyCsrf(c, c.env.SESSION_SECRET))) return c.redirect('/admin/profile')
  const body = await c.req.parseBody()
  const username = typeof body.username === 'string' ? body.username.trim() : undefined
  const password = typeof body.password === 'string' ? body.password.trim() : ''
  await updateCredentials(c.env.DB, {
    username: username || undefined,
    passwordHash: password ? await hashPassword(password) : undefined,
  })
  return c.redirect('/admin/profile')
})

export default admin
