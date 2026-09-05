import { raw } from 'hono/html'
import type { SiteProfile, BlogPost as BlogPostType } from '../../types'

// Format ISO date → "January 1, 2026" (matches Thymeleaf `MMMM d, yyyy`)
function fmtPostDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

interface BlogPostProps {
  owner: SiteProfile
  post: BlogPostType
  bodyHtml: string
}

export function BlogPost({ owner, post, bodyHtml }: BlogPostProps) {
  return (
    <>
      <div class="reading-progress" id="readingProgress"></div>

      <article class="post-article">
        <div class="container-narrow">
          <a href="/blog" class="post-back" data-cursor="back">← Back to blog</a>

          <header class="post-header">
            <div class="meta reveal">
              <span>{fmtPostDate(post.publishedAt)}</span>
              <span class="dot"></span>
              <span>{`${post.readingMinutes} min read`}</span>
              <span class="dot"></span>
              <span>{owner.name}</span>
            </div>
            <h1 class="reveal" data-split="" style="--d:.1s">{post.title}</h1>
            {post.excerpt && post.excerpt.trim() && (
              <p class="lead reveal" style="--d:.25s">{post.excerpt}</p>
            )}
          </header>

          <div class="prose reveal" style="--d:.4s">
            {raw(bodyHtml)}
          </div>

          <div class="post-footer">
            <div class="views">
              {raw(`Viewed <b>${post.views}</b> times`)}
            </div>
            <a href="/blog" class="post-back" style="margin: 0" data-cursor="back">← All posts</a>
          </div>
        </div>
      </article>

      {raw(`<script>
    (function () {
        var bar = document.getElementById('readingProgress');
        if (!bar) return;
        var onScroll = function() {
            var scroll = window.scrollY;
            var height = document.documentElement.scrollHeight - window.innerHeight;
            var pct = height > 0 ? Math.min(100, (scroll / height) * 100) : 0;
            bar.style.width = pct + '%';
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
    })();
</script>`)}
    </>
  )
}
