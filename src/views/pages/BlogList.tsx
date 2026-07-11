import type { BlogPost } from '../../types'

// Format ISO date → "Jan 01 · 2026" (matches Thymeleaf `MMM dd · yyyy`)
function fmtListDate(iso: string): string {
  const d = new Date(iso)
  const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
  const day = String(d.getUTCDate()).padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${month} ${day} · ${year}`
}

interface BlogListProps {
  posts: BlogPost[]
}

export function BlogList({ posts }: BlogListProps) {
  return (
    <>
      <section class="blog-hero">
        <div class="container">
          <div class="masthead">
            <span>The Journal</span>
            <span>Vol. 01 · Issue 01</span>
            <span>Published irregularly</span>
          </div>

          <div class="eyebrow reveal">The journal</div>
          <h1 class="reveal" data-split="" style="--d:.1s">
            Essays on <em>craft</em>, code, and the quiet in between.
          </h1>
          <p class="sub reveal" style="--d:.25s">
            Short field notes from building things. Unpolished, first-principles,
            occasionally wrong — published when they have something to say.
          </p>
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
                    <div class="date">{fmtListDate(post.publishedAt)}</div>
                    <div class="title-col">
                      <h2>{post.title}</h2>
                      <p class="excerpt">{post.excerpt}</p>
                    </div>
                    <div class="read-time">{post.readingMinutes} min</div>
                  </a>
                ))}
              </div>
            )
            : (
              <div class="empty-state reveal">
                No posts published yet. Come back soon — ideas are brewing.
              </div>
            )
          }
        </div>
      </section>
    </>
  )
}
