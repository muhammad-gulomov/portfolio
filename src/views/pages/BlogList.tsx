import { raw } from 'hono/html'
import type { BlogPost } from '../../types'

type Lang = 'en' | 'ru'
type TFn = (key: string, ...args: (string | number)[]) => string

// Format ISO date → "Jan 01 · 2026" (matches Thymeleaf `MMM dd · yyyy`)
function fmtListDate(iso: string, lang: Lang): string {
  const d = new Date(iso)
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const month = d.toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' })
  const day = String(d.getUTCDate()).padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${month} ${day} · ${year}`
}

interface BlogListProps {
  posts: BlogPost[]
  t: TFn
  lang: Lang
}

export function BlogList({ posts, t, lang }: BlogListProps) {
  return (
    <>
      <section class="blog-hero">
        <div class="container">
          <div class="masthead">
            <span>{t('blog.masthead.title')}</span>
            <span>{t('blog.masthead.notes')}</span>
            <span>{t('blog.masthead.freq')}</span>
          </div>

          <div class="eyebrow reveal">{t('blog.eyebrow')}</div>
          <h1 class="reveal" data-split="" style="--d:.1s">{raw(t('blog.title'))}</h1>
          <p class="sub reveal" style="--d:.25s">{t('blog.sub')}</p>
        </div>
      </section>

      <section class="posts-list">
        <div class="container">
          {posts.length > 0
            ? (
              <div>
                {posts.map((post, i) => (
                  <a
                    key={post.id}
                    class="post-row reveal"
                    style={`--d:${i * 0.05}s`}
                    href={`/blog/${post.slug}`}
                    data-cursor="read"
                  >
                    <div class="date">{fmtListDate(post.publishedAt, lang)}</div>
                    <div class="title-col">
                      <h2>{post.title}</h2>
                      <p class="excerpt">{post.excerpt}</p>
                    </div>
                    <div class="read-time">{t('blog.min', post.readingMinutes)}</div>
                  </a>
                ))}
              </div>
            )
            : (
              <div class="empty-state reveal">
                {t('blog.empty')}
              </div>
            )
          }
        </div>
      </section>
    </>
  )
}
