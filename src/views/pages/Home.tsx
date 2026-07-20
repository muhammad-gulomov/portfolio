import { raw } from 'hono/html'
import type { SiteProfile, WorkExperience, Project, BlogPost } from '../../types'

type Lang = 'en' | 'ru'
type TFn = (key: string, ...args: (string | number)[]) => string

function fmtBlogDate(iso: string, lang: Lang): string {
  const d = new Date(iso)
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function padNum(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

interface HomeProps {
  owner: SiteProfile
  work: WorkExperience[]
  workPeriods: Record<number, string>
  projects: Project[]
  latestPosts: BlogPost[]
  t: TFn
  lang: Lang
}

export function Home({ owner, work, workPeriods, projects, latestPosts, t, lang }: HomeProps) {
  const locationDisplay = owner.location && owner.location.trim() ? owner.location : 'Tashkent · UZ'
  const nameParts = owner.name ? owner.name.split(' ') : ['Muhammad', 'Gulomov']
  const firstName = nameParts[0] ?? 'Muhammad'
  const lastName = nameParts.slice(1).join(' ') || 'Gulomov'
  const bioLocation = owner.location && owner.location.trim()
    ? `${owner.location} (GMT+5)`
    : 'Tashkent, Uzbekistan (GMT+5)'
  const tagline = lang === 'ru' ? t('hero.tagline') : (owner.tagline || t('hero.tagline'))

  return (
    <>
      {/* ==================== HERO ==================== */}
      <section class="hero" id="top">
        <div class="hero-bg" aria-hidden="true">
          <span class="hero-crosshair tl"></span>
          <span class="hero-crosshair tr"></span>
          <span class="hero-crosshair bl"></span>
          <span class="hero-crosshair br"></span>
        </div>

        <div class="container">
          <div class="hero-index">
            <span class="mono">{t('hero.index')}</span>
            <span class="mono">—</span>
            <span class="mono">v2026</span>
          </div>

          <div class="hero-grid">
            <div class="hero-main">
              <div class="hero-meta-top">
                <span class="eyebrow">{t('job.title')}</span>
                <span class="hero-city">{locationDisplay}</span>
              </div>

              <h1 class="hero-title">
                <span class="line"><span>{firstName}</span></span>
                <span class="line"><span><em>{lastName}</em>.</span></span>
              </h1>

              <p class="hero-lede">{tagline}</p>
            </div>

            <aside class="hero-side">
              <div class="hero-now">
                <span class="mono hero-now-label">{t('hero.currently')}</span>
                <p>{raw(t('hero.currently.text'))}</p>
              </div>

              <div class="hero-stats">
                <div class="hstat">
                  <span class="hstat-n" data-counter="2">2</span>
                  <span class="hstat-l">{raw(t('stats.years'))}</span>
                </div>
                <div class="hstat">
                  <span class="hstat-n" data-counter="6">6</span>
                  <span class="hstat-l">{raw(t('stats.projects'))}</span>
                </div>
                <div class="hstat">
                  <span class="hstat-n">∞</span>
                  <span class="hstat-l">{raw(t('stats.curiosity'))}</span>
                </div>
              </div>

              <div class="socials hero-socials">
                <a href={owner.github} target="_blank" rel="noopener" aria-label="GitHub" data-cursor="github">
                  {raw(`<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>`)}
                </a>
                <a href={owner.linkedin} target="_blank" rel="noopener" aria-label="LinkedIn" data-cursor="linkedin">
                  {raw(`<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5V9h3v10zM6.5 7.7a1.7 1.7 0 1 1 0-3.5 1.7 1.7 0 0 1 0 3.5zM19 19h-3v-5c0-1.2-.4-2-1.5-2s-1.8.8-1.8 2v5h-3V9h2.8v1.4c.4-.6 1.4-1.6 3.2-1.6 2.3 0 3.3 1.5 3.3 3.9V19z"/></svg>`)}
                </a>
                <a href={owner.telegram} target="_blank" rel="noopener" aria-label="Telegram" data-cursor="telegram">
                  {raw(`<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>`)}
                </a>
                <a href={owner.instagram} target="_blank" rel="noopener" aria-label="Instagram" data-cursor="instagram">
                  {raw(`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`)}
                </a>
              </div>

              <div class="hero-ctas">
                <a href="#work" class="btn primary magnetic" data-cursor="explore">
                  <span>{t('hero.cta.work')}</span> <span class="arrow">→</span>
                </a>
                <a href="/blog" class="btn magnetic" data-cursor="read">
                  <span>{t('hero.cta.blog')}</span>
                </a>
              </div>
            </aside>
          </div>
        </div>

        <div class="scroll-hint" aria-hidden="true">
          <span>{t('hero.scroll')}</span>
        </div>
      </section>

      {/* ==================== TECH MARQUEE ==================== */}
      <section class="marquee" aria-label="Technologies">
        <div class="marquee-track" data-marquee="">
          <span class="marquee-item">Java <span class="marquee-star">✦</span></span>
          <span class="marquee-item">Spring&nbsp;Boot <span class="marquee-star">✦</span></span>
          <span class="marquee-item"><em>PostgreSQL</em> <span class="marquee-star">✦</span></span>
          <span class="marquee-item">NestJS <span class="marquee-star">✦</span></span>
          <span class="marquee-item">React <span class="marquee-star">✦</span></span>
          <span class="marquee-item"><em>TypeScript</em> <span class="marquee-star">✦</span></span>
          <span class="marquee-item">Docker <span class="marquee-star">✦</span></span>
          <span class="marquee-item">AWS <span class="marquee-star">✦</span></span>
          <span class="marquee-item"><em>REST&nbsp;APIs</em> <span class="marquee-star">✦</span></span>
          <span class="marquee-item">Thymeleaf <span class="marquee-star">✦</span></span>
        </div>
      </section>

      {/* ==================== ABOUT ==================== */}
      <section class="about" id="about">
        <div class="container">
          <div class="section-header reveal">
            <div>
              <div class="eyebrow" style="margin-bottom: 14px;">{t('about.eyebrow')}</div>
              <h2 data-split="">{raw(t('about.title'))}</h2>
            </div>
            <div class="section-index mono">{t('about.index')}</div>
          </div>

          <div class="about-grid">
            <div class="portrait reveal-clip" data-parallax="0.18">
              <div class="portrait-frame">
                {owner.photoPath && owner.photoPath.trim()
                  ? <img src={owner.photoPath} alt={`Portrait of ${owner.name}`} class="portrait-img" />
                  : <div class="initials"><em>MG</em></div>
                }
                <div class="portrait-ring"></div>
                <div class="portrait-tag">
                  <span class="mono">{t('about.since')}</span>
                </div>
              </div>
            </div>

            <div class="bio">
              <p class="reveal" style="--d:.1s">{raw(t('bio.p1'))}</p>
              <p class="reveal" style="--d:.2s">{raw(t('bio.p2'))}</p>
              <p class="reveal" style="--d:.3s">{raw(t('bio.p3'))}</p>

              <div class="bio-meta reveal" style="--d:.4s">
                <div class="bio-row">
                  <span class="bio-k mono">{t('about.based')}</span>
                  <span class="bio-v">{bioLocation}</span>
                </div>
                <div class="bio-row">
                  <span class="bio-k mono">{t('about.focus')}</span>
                  <span class="bio-v">{raw(t('about.focus.value'))}</span>
                </div>
                <div class="bio-row">
                  <span class="bio-k mono">{t('about.languages')}</span>
                  <span class="bio-v">{t('about.languages.value')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== WORK TIMELINE ==================== */}
      <section class="experience" id="work">
        <div class="container">
          <div class="section-header reveal">
            <div>
              <div class="eyebrow" style="margin-bottom: 14px;">{t('work.eyebrow')}</div>
              <h2 data-split="">{raw(t('work.title'))}</h2>
            </div>
            <div class="section-index mono">{t('work.index')}</div>
          </div>

          {work.length > 0
            ? (
              <div class="timeline">
                {work.map((w, i) => (
                  <div key={w.id} class="timeline-item reveal" style={`--d:${i * 0.08}s`}>
                    <div class="t-num mono">{padNum(i + 1)}</div>
                    <div class="t-spine">
                      <span class="t-dot"></span>
                    </div>
                    <div class="t-card">
                      <div class="t-card-head">
                        <span class="period mono">{workPeriods[w.id]}</span>
                        {w.location && w.location.trim() && (
                          <span class="t-chip">{w.location}</span>
                        )}
                      </div>
                      <h3 class="t-role">{w.role}</h3>
                      <div class="t-company">
                        {w.url && w.url.trim()
                          ? <a href={w.url} target="_blank" rel="noopener" data-cursor="visit">{w.company}</a>
                          : <span>{w.company}</span>
                        }
                      </div>
                      {w.summary && w.summary.trim() && (
                        <p class="t-summary">{w.summary}</p>
                      )}
                      {w.tech && w.tech.trim() && (
                        <div class="t-tech">
                          {w.tech.split(',').map((tech, ti) => (
                            <span key={ti}>{tech.trim()}</span>
                          ))}
                        </div>
                      )}
                      {w.projectLinks && w.projectLinks.trim() && (
                        <div class="t-links">
                          {w.projectLinks.split(',').map((link, li) => {
                            const trimmed = link.trim()
                            const label = trimmed.replace('https://', '').replace('http://', '').replace('www.', '')
                            return (
                              <a key={li} href={trimmed} target="_blank" rel="noopener" data-cursor="visit">
                                {label}
                              </a>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
            : (
              <div class="empty-state reveal">
                {t('work.empty')}
              </div>
            )
          }
        </div>
      </section>

      {/* ==================== PROJECTS ==================== */}
      <section class="projects" id="projects">
        <div class="container">
          <div class="section-header reveal">
            <div>
              <div class="eyebrow" style="margin-bottom: 14px;">{t('projects.eyebrow')}</div>
              <h2 data-split="">{raw(t('projects.title'))}</h2>
            </div>
            <div class="section-index mono">{t('projects.index')}</div>
          </div>

          {projects.length > 0
            ? (
              <div class="projects-grid">
                {projects.map((p, i) => {
                  const href = p.url && p.url.trim()
                    ? p.url
                    : (p.githubUrl && p.githubUrl.trim() ? p.githubUrl : '#')
                  const hasLink = (p.url && p.url.trim()) || (p.githubUrl && p.githubUrl.trim())
                  const target = hasLink ? '_blank' : '_self'
                  return (
                    <a
                      key={p.id}
                      class="project-card reveal"
                      style={`--d:${i * 0.06}s`}
                      href={href}
                      target={target}
                      rel="noopener"
                      data-cursor="view"
                    >
                      <div class="pc-head">
                        <span class="pc-num mono">N° {padNum(i + 1)}</span>
                        <span class="pc-arrow">↗</span>
                      </div>
                      <div class="pc-body">
                        <h3 class="pc-title">{p.name}</h3>
                        <p class="pc-tagline">{p.tagline ?? p.description}</p>
                      </div>
                      <div class="pc-foot">
                        {p.tech && p.tech.trim() && (
                          <div class="tech-row">
                            {p.tech.split(',').map((tech, ti) => (
                              <span key={ti}>{tech.trim()}</span>
                            ))}
                          </div>
                        )}
                        <div class="pc-kind">
                          {p.url && p.url.trim() && <span>{t('projects.live')}</span>}
                          {(!p.url || !p.url.trim()) && p.githubUrl && p.githubUrl.trim() && <span>{t('projects.source')}</span>}
                        </div>
                      </div>
                      <div class="pc-sheen" aria-hidden="true"></div>
                    </a>
                  )
                })}
              </div>
            )
            : (
              <div class="empty-state reveal">
                {t('projects.empty')}
              </div>
            )
          }
        </div>
      </section>

      {/* ==================== BLOG PREVIEW ==================== */}
      <section class="blog-preview" id="blog">
        <div class="container">
          <div class="section-header reveal">
            <div>
              <div class="eyebrow" style="margin-bottom: 14px;">{t('blogp.eyebrow')}</div>
              <h2 data-split="">{raw(t('blogp.title'))}</h2>
            </div>
            <div class="section-index-wrap">
              <div class="section-index mono">{t('blogp.index')}</div>
              <a href="/blog" class="see-all" data-cursor="read">{t('blogp.all')} <span class="arrow">→</span></a>
            </div>
          </div>

          {latestPosts.length > 0
            ? (
              <div class="blog-preview-list">
                {latestPosts.map((post, i) => (
                  <a
                    key={post.id}
                    class="preview-row reveal"
                    style={`--d:${i * 0.08}s`}
                    href={`/blog/${post.slug}`}
                    data-cursor="read"
                  >
                    <span class="pr-index mono">{padNum(i + 1)}</span>
                    <div class="pr-body">
                      <div class="pr-meta mono">
                        <span>{fmtBlogDate(post.publishedAt, lang)}</span>
                        <span class="sep">·</span>
                        <span>{t('blog.minread', post.readingMinutes)}</span>
                      </div>
                      <h3 class="pr-title">{post.title}</h3>
                      <p class="pr-excerpt">{post.excerpt}</p>
                    </div>
                    <span class="pr-go"><span class="arrow">→</span></span>
                  </a>
                ))}
              </div>
            )
            : (
              <div class="empty-state reveal">
                {t('blogp.empty')}
              </div>
            )
          }
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section class="cta-section">
        <div class="container">
          <div class="cta-inner reveal">
            <span class="eyebrow" style="margin-bottom: 22px;">{t('cta.eyebrow')}</span>
            <h2 class="cta-head">
              <span class="line"><span>{t('cta.line1')}</span></span>
              <span class="line"><span>{raw(t('cta.line2'))}</span></span>
            </h2>
            <p class="cta-sub">{t('cta.sub')}</p>
            <div class="cta-ctas">
              <a href={owner.telegram} target="_blank" rel="noopener" class="btn primary magnetic" data-cursor="message">
                <span>{t('cta.telegram')}</span> <span class="arrow">→</span>
              </a>
              <a href={owner.linkedin} target="_blank" rel="noopener" class="btn magnetic" data-cursor="connect">
                <span>{t('cta.linkedin')}</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
