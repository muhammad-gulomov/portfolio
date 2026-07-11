import { Hono } from 'hono'
import type { Env, Vars } from '../types'
import { listPublished, getBySlug, incrementViews } from '../db/blog'
import { renderPostHtml } from '../content/markdown'
import { BlogList } from '../views/pages/BlogList'
import { BlogPost } from '../views/pages/BlogPost'

const blogRoutes = new Hono<{ Bindings: Env; Variables: Vars }>()

blogRoutes.get('/blog', async (c) => {
  const posts = await listPublished(c.env.DB)
  return c.render(<BlogList posts={posts} />, { title: 'Journal', css: 'blog' })
})

blogRoutes.get('/blog/:slug', async (c) => {
  const slug = c.req.param('slug')
  const post = await getBySlug(c.env.DB, slug)

  if (!post || post.published === 0) {
    return c.notFound()
  }

  await incrementViews(c.env.DB, post.id)
  const bodyHtml = await renderPostHtml(post.content)

  return c.render(
    <BlogPost owner={c.get('owner')} post={post} bodyHtml={bodyHtml} />,
    { title: post.title, css: 'blog' },
  )
})

export default blogRoutes
