import type { BlogPost } from '../types'
import {
  slugify,
  excerptFrom,
  readingMinutes as computeReadingMinutes,
} from '../content/derive'

const SELECT_POST = `
  SELECT
    id, slug, title, excerpt, content,
    published_at AS publishedAt,
    reading_minutes AS readingMinutes,
    views, published
  FROM blog_posts
`

export async function listPublished(db: D1Database): Promise<BlogPost[]> {
  const { results } = await db
    .prepare(`${SELECT_POST} WHERE published = 1 ORDER BY published_at DESC`)
    .all<BlogPost>()
  return results
}

export async function listAll(db: D1Database): Promise<BlogPost[]> {
  const { results } = await db
    .prepare(`${SELECT_POST} ORDER BY published_at DESC`)
    .all<BlogPost>()
  return results
}

export async function latest(db: D1Database, n: number): Promise<BlogPost[]> {
  const { results } = await db
    .prepare(`${SELECT_POST} WHERE published = 1 ORDER BY published_at DESC LIMIT ?`)
    .bind(n)
    .all<BlogPost>()
  return results
}

export async function getBySlug(db: D1Database, slug: string): Promise<BlogPost | null> {
  return db
    .prepare(`${SELECT_POST} WHERE slug = ?`)
    .bind(slug)
    .first<BlogPost>()
}

export async function getById(db: D1Database, id: number): Promise<BlogPost | null> {
  return db
    .prepare(`${SELECT_POST} WHERE id = ?`)
    .bind(id)
    .first<BlogPost>()
}

export async function incrementViews(db: D1Database, id: number): Promise<void> {
  await db
    .prepare('UPDATE blog_posts SET views = views + 1 WHERE id = ?')
    .bind(id)
    .run()
}

export async function deletePost(db: D1Database, id: number): Promise<void> {
  await db
    .prepare('DELETE FROM blog_posts WHERE id = ?')
    .bind(id)
    .run()
}

/** Returns the id of the inserted or updated row. */
export async function savePost(db: D1Database, p: BlogPost): Promise<number> {
  const slug = p.slug?.trim() || slugify(p.title)
  const excerpt = p.excerpt?.trim() || excerptFrom(p.content)
  const readingMins = computeReadingMinutes(p.content)

  if (!p.id) {
    // INSERT
    const publishedAt = p.publishedAt || new Date().toISOString()
    const result = await db
      .prepare(
        `INSERT INTO blog_posts
           (slug, title, excerpt, content, published_at, reading_minutes, views, published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(slug, p.title, excerpt, p.content, publishedAt, readingMins, 0, p.published)
      .run()
    return result.meta.last_row_id as number
  } else {
    // UPDATE — preserve existing views AND published_at
    await db
      .prepare(
        `UPDATE blog_posts SET
           slug = ?, title = ?, excerpt = ?, content = ?,
           reading_minutes = ?, published = ?
         WHERE id = ?`,
      )
      .bind(slug, p.title, excerpt, p.content, readingMins, p.published, p.id)
      .run()
    return p.id
  }
}
