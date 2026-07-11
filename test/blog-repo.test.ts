import { env } from 'cloudflare:workers'
import { describe, it, expect, beforeEach } from 'vitest'
import type { Env } from '../src/types'
import {
  listPublished, listAll, latest,
  getBySlug, getById,
  savePost, deletePost, incrementViews,
} from '../src/db/blog'

const db = (env as unknown as Env).DB

beforeEach(async () => {
  await db.exec('DELETE FROM blog_posts')
})

// ─── Blog repo ─────────────────────────────────────────────────────────────────

describe('blog repo', () => {

  it('savePost INSERT → getBySlug round-trip (publishedAt + readingMinutes aliased/populated)', async () => {
    const id = await savePost(db, {
      id: 0,
      slug: 'hello-world',
      title: 'Hello World',
      excerpt: null,
      content: 'This is the body of the post. '.repeat(10),
      publishedAt: '2024-01-15T10:00:00.000Z',
      readingMinutes: 0, // will be computed
      views: 0,
      published: 1,
    })
    expect(typeof id).toBe('number')
    expect(id).toBeGreaterThan(0)

    const post = await getBySlug(db, 'hello-world')
    expect(post).not.toBeNull()
    expect(post!.title).toBe('Hello World')
    expect(post!.publishedAt).toBe('2024-01-15T10:00:00.000Z') // aliased from published_at
    expect(post!.readingMinutes).toBeGreaterThanOrEqual(1)      // aliased from reading_minutes
    expect(post!.id).toBe(id)
  })

  it('slug auto-derived from title when blank', async () => {
    await savePost(db, {
      id: 0,
      slug: '',
      title: 'My Awesome Post',
      excerpt: null,
      content: 'Some content here.',
      publishedAt: '',
      readingMinutes: 0,
      views: 0,
      published: 1,
    })
    const post = await getBySlug(db, 'my-awesome-post')
    expect(post).not.toBeNull()
    expect(post!.slug).toBe('my-awesome-post')
  })

  it('excerpt auto-derived from content when blank', async () => {
    const content = 'This is the content of the blog post. It has multiple words and sentences.'
    await savePost(db, {
      id: 0,
      slug: 'auto-excerpt',
      title: 'Auto Excerpt',
      excerpt: null,
      content,
      publishedAt: '2024-01-01T00:00:00.000Z',
      readingMinutes: 0,
      views: 0,
      published: 1,
    })
    const post = await getBySlug(db, 'auto-excerpt')
    expect(post).not.toBeNull()
    expect(post!.excerpt).not.toBeNull()
    expect(post!.excerpt!.length).toBeGreaterThan(0)
    expect(post!.excerpt).toContain('content of the blog post')
  })

  it('unpublished post excluded from listPublished but present in listAll', async () => {
    await savePost(db, {
      id: 0, slug: 'pub', title: 'Published', excerpt: null, content: 'body',
      publishedAt: '2024-01-01T00:00:00.000Z', readingMinutes: 0, views: 0, published: 1,
    })
    await savePost(db, {
      id: 0, slug: 'unpub', title: 'Unpublished', excerpt: null, content: 'body',
      publishedAt: '2024-01-02T00:00:00.000Z', readingMinutes: 0, views: 0, published: 0,
    })

    const published = await listPublished(db)
    expect(published.length).toBe(1)
    expect(published[0].slug).toBe('pub')

    const all = await listAll(db)
    expect(all.length).toBe(2)
  })

  it('incrementViews bumps view count', async () => {
    const id = await savePost(db, {
      id: 0, slug: 'view-test', title: 'View Test', excerpt: null, content: 'body',
      publishedAt: '2024-01-01T00:00:00.000Z', readingMinutes: 0, views: 0, published: 1,
    })
    await incrementViews(db, id)
    await incrementViews(db, id)
    const post = await getById(db, id)
    expect(post!.views).toBe(2)
  })

  it('latest(2) respects limit + published-only + publishedAt DESC order', async () => {
    // Insert 3 published posts with distinct published_at, plus one unpublished
    await savePost(db, {
      id: 0, slug: 'oldest', title: 'Oldest', excerpt: null, content: 'body',
      publishedAt: '2023-01-01T00:00:00.000Z', readingMinutes: 0, views: 0, published: 1,
    })
    await savePost(db, {
      id: 0, slug: 'middle', title: 'Middle', excerpt: null, content: 'body',
      publishedAt: '2024-01-01T00:00:00.000Z', readingMinutes: 0, views: 0, published: 1,
    })
    await savePost(db, {
      id: 0, slug: 'newest', title: 'Newest', excerpt: null, content: 'body',
      publishedAt: '2025-01-01T00:00:00.000Z', readingMinutes: 0, views: 0, published: 1,
    })
    await savePost(db, {
      id: 0, slug: 'hidden', title: 'Hidden', excerpt: null, content: 'body',
      publishedAt: '2025-06-01T00:00:00.000Z', readingMinutes: 0, views: 0, published: 0,
    })

    const posts = await latest(db, 2)
    expect(posts.length).toBe(2)
    expect(posts[0].slug).toBe('newest') // DESC order
    expect(posts[1].slug).toBe('middle')
  })

  it('savePost UPDATE preserves original views and publishedAt', async () => {
    const publishedAt = '2024-03-10T08:00:00.000Z'
    const id = await savePost(db, {
      id: 0, slug: 'preserve-test', title: 'Original', excerpt: null, content: 'original content',
      publishedAt, readingMinutes: 0, views: 0, published: 1,
    })

    // Bump views
    await incrementViews(db, id)
    await incrementViews(db, id)

    // Update title and content (but not views or publishedAt)
    await savePost(db, {
      id, slug: 'preserve-test', title: 'Updated Title', excerpt: null, content: 'updated content body',
      publishedAt: '2099-01-01T00:00:00.000Z', // should be ignored on UPDATE
      readingMinutes: 0,
      views: 999, // should be ignored on UPDATE
      published: 1,
    })

    const post = await getById(db, id)
    expect(post).not.toBeNull()
    expect(post!.title).toBe('Updated Title')
    expect(post!.views).toBe(2)            // preserved, not overwritten with 999
    expect(post!.publishedAt).toBe(publishedAt) // preserved original publishedAt
  })

  it('deletePost removes the row', async () => {
    const id = await savePost(db, {
      id: 0, slug: 'to-delete', title: 'Delete Me', excerpt: null, content: 'body',
      publishedAt: '2024-01-01T00:00:00.000Z', readingMinutes: 0, views: 0, published: 1,
    })
    await deletePost(db, id)
    const post = await getById(db, id)
    expect(post).toBeNull()
  })

  it('getById returns null for missing id', async () => {
    const post = await getById(db, 9999)
    expect(post).toBeNull()
  })

  it('getBySlug returns null for missing slug', async () => {
    const post = await getBySlug(db, 'does-not-exist')
    expect(post).toBeNull()
  })
})
