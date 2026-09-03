import type { BlogPost, WorkExperience } from '../../types'

// Format ISO date → "MMM d, yyyy"  (e.g. "Jan 15, 2026")
function fmtBlogDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

// Format ISO date → "MMM yyyy"  (e.g. "Jan 2024")
function fmtMonthYear(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

interface DashboardProps {
  posts: BlogPost[]
  work: WorkExperience[]
  csrf: string
}

export function Dashboard({ posts, work, csrf }: DashboardProps) {
  return (
    <section class="admin-shell">
      <div class="container">
        <div class="eyebrow">Control room</div>
        <h1>Admin <em>dashboard</em>.</h1>
        <p class="sub">Manage posts, work history, and projects. Changes go live immediately.</p>

        {/* TOOLBAR */}
        <div class="admin-toolbar">
          <a href="/admin/profile" class="btn primary">Profile &amp; settings</a>
          <a href="/" target="_blank" class="btn">View site</a>
          <form action="/logout" method="post" style="margin:0;">
            <input type="hidden" name="_csrf" value={csrf} />
            <button type="submit" class="btn logout-btn">Log out</button>
          </form>
        </div>

        {/* POSTS */}
        <section class="admin-section">
          <header>
            <h2>Blog posts</h2>
            <div class="admin-actions">
              <span class="count">{posts.length} total</span>
              <a href="/admin/posts/new" class="btn primary">New post</a>
            </div>
          </header>

          <div class="admin-list">
            {posts.length === 0 && (
              <div class="empty">No posts yet. Write the first.</div>
            )}

            {posts.map((p) => (
              <div key={p.id} class="row">
                <div>
                  <div class="title">{p.title}</div>
                  <div class="sub-meta">
                    <span>{fmtBlogDate(p.publishedAt)}</span>
                    <span>{p.readingMinutes} min</span>
                    <span>{p.views} views</span>
                    {p.published ? (
                      <span class="pub">· Published</span>
                    ) : (
                      <span class="draft">· Draft</span>
                    )}
                  </div>
                </div>
                <div class="actions">
                  <a href={`/blog/${p.slug}`} target="_blank">View</a>
                  <a href={`/admin/posts/${p.id}/edit`}>Edit</a>
                  <form
                    action={`/admin/posts/${p.id}/delete`}
                    method="post"
                    style="display:inline"
                    onsubmit="return confirm('Delete this post?')"
                  >
                    <input type="hidden" name="_csrf" value={csrf} />
                    <button type="submit" class="danger">Delete</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* WORK */}
        <section class="admin-section">
          <header>
            <h2>Work history</h2>
            <div class="admin-actions">
              <span class="count">{work.length} entries</span>
              <a href="/admin/work/new" class="btn primary">New entry</a>
            </div>
          </header>

          <div class="admin-list">
            {work.length === 0 && (
              <div class="empty">No entries yet.</div>
            )}

            {work.map((w) => (
              <div key={w.id} class="row">
                <div>
                  <div class="title"><span>{w.role}</span> · <span>{w.company}</span></div>
                  <div class="sub-meta">
                    <span>{fmtMonthYear(w.startDate)}</span>
                    <span>—</span>
                    <span>{w.endDate != null ? fmtMonthYear(w.endDate) : 'Present'}</span>
                    {w.location && w.location.trim() && (
                      <span>· {w.location}</span>
                    )}
                    <span>· order {w.displayOrder}</span>
                  </div>
                </div>
                <div class="actions">
                  <a href={`/admin/work/${w.id}/edit`}>Edit</a>
                  <form
                    action={`/admin/work/${w.id}/delete`}
                    method="post"
                    style="display:inline"
                    onsubmit="return confirm('Delete this entry?')"
                  >
                    <input type="hidden" name="_csrf" value={csrf} />
                    <button type="submit" class="danger">Delete</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </section>
  )
}
