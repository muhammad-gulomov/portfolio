import { jsxRenderer } from 'hono/jsx-renderer'
import { raw } from 'hono/html'
import type { SiteProfile } from '../types'

// Augment Hono's ContextRenderer so c.render(content, props) is typed
declare module 'hono' {
  interface ContextRenderer {
    (
      content: string | Promise<string>,
      props: { title: string; meta?: string; css?: string },
    ): Response
  }
}

const BUILD = 'v1'

// Favicon as inline SVG data-URI (verbatim from head.html)
const FAVICON =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%230a0b0f'/><circle cx='16' cy='16' r='11' fill='none' stroke='%23e8c391' stroke-width='1.4'/><text x='16' y='21' text-anchor='middle' font-family='Georgia' font-weight='500' font-style='italic' fill='%23e8c391' font-size='14'>m</text></svg>"

export default jsxRenderer(
  (
    { children, title, meta, css }: {
      children?: unknown
      title: string
      meta?: string
      css?: string
    },
    c,
  ) => {
    const owner = c.get('owner') as SiteProfile
    const currentYear = c.get('currentYear') as number

    const pageTitle = title
      ? `${title}${owner?.name ? ` — ${owner.name}` : ''}`
      : 'Portfolio'

    const description = meta ?? (
      owner?.tagline
        ? `${owner.name} — ${owner.tagline}`
        : 'Software engineer portfolio'
    )

    const initials = owner?.name ? owner.name[0].toLowerCase() : 'm'

    const emailHref = owner?.email ? `mailto:${owner.email}` : '#'

    return (
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="theme-color" content="#0a0b0f" />
          <meta name="description" content={description} />
          <title>{pageTitle}</title>

          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
          <link
            href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..900,0..100,0..1;1,9..144,300..900,0..100,0..1&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@300;400;500;600&display=swap"
            rel="stylesheet"
          />

          <link rel="stylesheet" href={`/css/base.css?v=${BUILD}`} />
          {css && <link rel="stylesheet" href={`/css/${css}.css?v=${BUILD}`} />}

          <link rel="icon" href={FAVICON} />
        </head>
        <body>
          {/* skip link */}
          <a class="skip-link" href="#main">Skip to content</a>

          {/* film-grain overlay */}
          <div class="grain" aria-hidden="true"></div>

          {/* custom cursor */}
          <div class="cursor" aria-hidden="true"></div>
          <div class="cursor-label" aria-hidden="true"></div>

          {/* top status strip */}
          <div class="statusbar" aria-hidden="true">
            <div class="track">
              <span class="spacer"></span>
              <span class="chip">
                Now: shipping{' '}
                <em style="color:var(--gold-400);font-style:normal;">@yodla</em>
              </span>
              <span class="chip clock" data-clock>—:—</span>
            </div>
          </div>

          {/* hairline scroll progress bar */}
          <div class="scroll-progress" aria-hidden="true"><span></span></div>

          <header class="topbar">
            <div class="container">
              <a href="/" class="logo" data-cursor="home">
                <span class="mark">
                  <em>{initials}</em>
                </span>
                <span>{owner?.name ?? 'Muhammad Gulomov'}</span>
                <span class="sep">·</span>
                <span class="job">Software Engineer</span>
              </a>

              <button
                class="nav-toggle"
                aria-label="Toggle menu"
                aria-expanded="false"
                aria-controls="primary-nav"
              >
                Menu
              </button>

              <nav id="primary-nav">
                <ul class="nav">
                  <li><a href="/#work">Work</a></li>
                  <li><a href="/#projects">Projects</a></li>
                  <li><a href="/blog">Journal</a></li>
                  <li><a href="/#contact" class="cta">Get in touch</a></li>
                </ul>
              </nav>
            </div>
          </header>

          <main id="main">
            {children}
          </main>

          <footer id="contact" class="site-footer">
            <div class="container">

              <div class="wordmark-line">
                <span class="wordmark reveal" data-split-chars>
                  Let's build.
                </span>
              </div>

              <div class="foot-grid">
                <div class="foot-col">
                  <h4>Say hello</h4>
                  <p>
                    Looking for collaborators, candid tech conversation, or a second
                    pair of eyes on a tricky problem? The inbox is open.
                  </p>
                  <p style="margin-top:14px;">
                    <a
                      href={emailHref}
                      style="color:var(--gold-400);border-bottom:1px solid rgba(232,195,145,0.3);padding-bottom:2px;"
                    >
                      Email me
                    </a>
                  </p>
                </div>

                <div class="foot-col">
                  <h4>Elsewhere</h4>
                  <div class="socials">
                    <a href={owner?.github} target="_blank" rel="noopener" aria-label="GitHub" data-cursor="github">
                      {raw(`<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>`)}
                    </a>
                    <a href={owner?.linkedin} target="_blank" rel="noopener" aria-label="LinkedIn" data-cursor="linkedin">
                      {raw(`<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5V9h3v10zM6.5 7.7a1.7 1.7 0 1 1 0-3.5 1.7 1.7 0 0 1 0 3.5zM19 19h-3v-5c0-1.2-.4-2-1.5-2s-1.8.8-1.8 2v5h-3V9h2.8v1.4c.4-.6 1.4-1.6 3.2-1.6 2.3 0 3.3 1.5 3.3 3.9V19z"/></svg>`)}
                    </a>
                    <a href={owner?.telegram} target="_blank" rel="noopener" aria-label="Telegram" data-cursor="telegram">
                      {raw(`<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>`)}
                    </a>
                    <a href={owner?.instagram} target="_blank" rel="noopener" aria-label="Instagram" data-cursor="instagram">
                      {raw(`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`)}
                    </a>
                  </div>
                </div>

                <div class="foot-col">
                  <h4>Navigate</h4>
                  <div>
                    <a href="/#work">Work</a>
                    <a href="/#projects">Projects</a>
                    <a href="/blog">Journal</a>
                    <a href="/#about">About</a>
                  </div>
                </div>

                <div class="foot-col">
                  <h4>Colophon</h4>
                  <p style="font-size: 0.88em;">
                    Cloudflare Workers · Hono · D1.<br />
                    Set in <span style="color:var(--gold-400);">Fraunces</span>, Instrument Sans &amp; JetBrains Mono.
                  </p>
                </div>
              </div>

              <div class="foot-bottom">
                <span>
                  &copy; {currentYear} {owner?.name ?? 'Muhammad Gulomov'}. Crafted in Tashkent.
                </span>
              </div>
            </div>
          </footer>

          <script src={`/js/reveal.js?v=${BUILD}`} defer></script>
        </body>
      </html>
    )
  },
  { docType: true },
)
