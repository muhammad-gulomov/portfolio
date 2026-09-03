import type { BlogPost } from '../../types'

interface PostFormProps {
  post: BlogPost | null
  csrf: string
}

export function PostForm({ post, csrf }: PostFormProps) {
  const isNew = post == null || post.id == null
  return (
    <section class="admin-shell">
      <div class="container">
        <a href="/admin" class="admin-back">← Dashboard</a>

        <div class="eyebrow">Compose</div>
        <h1>{isNew ? 'New post.' : 'Edit post.'}</h1>
        <p class="sub">Write in markdown. Slug and reading time are computed if left blank.</p>

        <form class="admin-form" action="/admin/posts" method="post">
          <input type="hidden" name="id" value={post?.id ?? ''} />
          <input type="hidden" name="_csrf" value={csrf} />

          <div class="field">
            <label for="title">Title</label>
            <input type="text" id="title" name="title" value={post?.title ?? ''} placeholder="On building quiet systems" required />
          </div>

          <div class="field">
            <label for="slug">Slug <span class="hint">(leave blank to auto-generate)</span></label>
            <input type="text" id="slug" name="slug" value={post?.slug ?? ''} placeholder="on-building-quiet-systems" />
          </div>

          <div class="field">
            <label for="excerpt">Excerpt <span class="hint">(shown in list + hero; 1–2 sentences)</span></label>
            <textarea id="excerpt" name="excerpt" rows={3} style="min-height:90px">{post?.excerpt ?? ''}</textarea>
          </div>

          <div class="field">
            <label for="content">Body <span class="hint">(markdown; supports headings, lists, code, tables, links)</span></label>
            <textarea id="content" class="big" name="content" required placeholder="## Heading&#10;&#10;Write your post here...">{post?.content ?? ''}</textarea>
          </div>

          <div class="field">
            <label class="checkbox">
              <input type="checkbox" name="published" value="true" checked={!!post?.published} />
              <span>Publish immediately</span>
            </label>
          </div>

          <div class="form-footer">
            <div class="admin-actions">
              <button type="submit" class="btn primary">Save post</button>
              <a href="/admin" class="btn">Cancel</a>
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}
