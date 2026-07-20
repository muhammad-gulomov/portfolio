import { Hono } from 'hono'
import type { Env, Vars } from '../types'
import { listPublished, getBySlug, incrementViews } from '../db/blog'
import { renderPostHtml } from '../content/markdown'
import { BlogList } from '../views/pages/BlogList'
import { BlogPost } from '../views/pages/BlogPost'

const blogRoutes = new Hono<{ Bindings: Env; Variables: Vars }>()

blogRoutes.get('/blog', async (c) => {
  const posts = await listPublished(c.env.DB)
  const t = c.get('t')
  const lang = c.get('lang')
  return c.render(
    <BlogList posts={posts} t={t} lang={lang} />,
    { title: t('page.blog'), css: 'blog' },
  )
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
    <BlogPost
      owner={c.get('owner')}
      post={post}
      bodyHtml={bodyHtml}
      t={c.get('t')}
      lang={c.get('lang')}
    />,
    { title: post.title, css: 'blog' },
  )
})

export default blogRoutes
