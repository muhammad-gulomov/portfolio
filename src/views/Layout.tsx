import { jsxRenderer } from 'hono/jsx-renderer'
import { raw } from 'hono/html'
import type { SiteProfile } from '../types'
import type { Lang } from '../i18n/messages'

declare module 'hono' {
  interface ContextRenderer {
    (
      content: string | Promise<string>,
      props: { title: string; meta?: string; css?: string },
    ): Response
  }
}

const BUILD = 'v2026'

const FAVICON =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%230b0e14'/><rect x='5' y='5' width='22' height='22' rx='6' fill='none' stroke='%232ee6a6' stroke-width='1.4'/><text x='16' y='21' text-anchor='middle' font-family='Arial' font-weight='700' fill='%232ee6a6' font-size='14'>m</text></svg>"

const THEME_BOOT = `(function(){var t;try{t=localStorage.getItem('theme')}catch(e){}if(t!=='light'&&t!=='dark'){t='dark'}document.documentElement.setAttribute('data-theme',t);if(t==='light'){var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#f6f8fa')}})();`

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
    const lang = (c.get('lang') as Lang) ?? 'en'
    const t = c.get('t') as (key: string, ...args: (string | number)[]) => string

    const pageTitle = title
      ? `${title}${owner?.name ? ` — ${owner.name}` : ''}`
      : t('page.home')

    const tagline = lang === 'ru' ? t('hero.tagline') : (owner?.tagline || t('hero.tagline'))
    const description = meta ?? (
      owner?.name
        ? `${owner.name} — ${tagline}`
        : t('meta.fallback')
    )

    const initials = owner?.name ? owner.name[0].toLowerCase() : 'm'
    const emailHref = owner?.email ? `mailto:${owner.email}` : '#'
    const enActive = lang !== 'ru' ? 'active' : ''
    const ruActive = lang === 'ru' ? 'active' : ''

    return (
      <html lang={lang}>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="theme-color" content="#0b0e14" />
          {raw(`<script>${THEME_BOOT}</script>`)}
          <meta name="description" content={description} />
          <title>{pageTitle}</title>

          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
          <link
            href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@300;400;500;600&display=swap"
            rel="stylesheet"
          />

          <link rel="stylesheet" href={`/css/base.css?v=${BUILD}`} />
          {css && <link rel="stylesheet" href={`/css/${css}.css?v=${BUILD}`} />}

          <link rel="icon" href={FAVICON} />
        </head>
        <body>
          <a class="skip-link" href="#main">{t('nav.skip')}</a>

          <div class="grain" aria-hidden="true"></div>
          <div class="cursor" aria-hidden="true"></div>
          <div class="cursor-label" aria-hidden="true"></div>

          <div class="statusbar">
            <div class="track">
              <span class="lang-switch">
                <a href="?lang=en" class={enActive} aria-label="English" title="English">
                  <span class="flag" aria-hidden="true">🇬🇧</span>
                </a>
                <a href="?lang=ru" class={ruActive} aria-label="Русский" title="Русский">
                  <span class="flag" aria-hidden="true">🇷🇺</span>
                </a>
              </span>
              <button class="theme-toggle compact" type="button" aria-label={t('nav.theme')} data-theme-toggle>
                {raw(`<svg class="icon-sun" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`)}
                {raw(`<svg class="icon-moon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`)}
              </button>
              <span class="spacer"></span>
              <span class="chip" aria-hidden="true">
                {t('status.now')}{' '}
                <em style="color:var(--gold-400);font-style:normal;">@yodla</em>
              </span>
              <span class="chip clock" data-clock data-clock-label={t('status.local')}>—:—</span>
            </div>
          </div>

          <div class="scroll-progress" aria-hidden="true"><span></span></div>

          <header class="topbar">
            <div class="container">
              <a href="/" class="logo" data-cursor="home">
                <span class="mark"><em>{initials}</em></span>
                <span>{owner?.name ?? 'Muhammad Gulomov'}</span>
                <span class="sep">·</span>
                <span class="job">{t('job.title')}</span>
              </a>

              <nav id="primary-nav">
                <ul class="nav">
                  <li><a href="/#about">{t('nav.about')}</a></li>
                  <li><a href="/#work">{t('nav.work')}</a></li>
                  <li><a href="/#projects">{t('nav.projects')}</a></li>
                  <li><a href="/blog">{t('nav.blog')}</a></li>
                  <li><a href="/#contact" class="cta">{t('nav.contact')}</a></li>
                </ul>
              </nav>

              <div class="topbar-actions">
                <button
                  class="nav-toggle"
                  aria-label={t('nav.menu')}
                  aria-expanded="false"
                  aria-controls="primary-nav"
                >
                  {t('nav.menu')}
                </button>
              </div>
            </div>
          </header>

          <main id="main">{children}</main>

          <footer id="contact" class="site-footer">
            <div class="container">
              <div class="wordmark-line">
                <span class="wordmark reveal" data-split-chars>{t('foot.wordmark')}</span>
              </div>

              <div class="foot-grid">
                <div class="foot-col">
                  <h4>{t('foot.hello')}</h4>
                  <p>{t('foot.hello.text')}</p>
                  <p style="margin-top:14px;">
                    <a
                      href={emailHref}
                      style="color:var(--gold-400);border-bottom:1px solid rgba(46,230,166,0.3);padding-bottom:2px;"
                    >
                      {t('foot.email')}
                    </a>
                  </p>
                </div>

                <div class="foot-col">
                  <h4>{t('foot.elsewhere')}</h4>
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
                  <h4>{t('foot.navigate')}</h4>
                  <div>
                    <a href="/#about">{t('nav.about')}</a>
                    <a href="/#work">{t('nav.work')}</a>
                    <a href="/#projects">{t('nav.projects')}</a>
                    <a href="/blog">{t('nav.blog')}</a>
                    <a href="/#top">{t('foot.top')}</a>
                  </div>
                </div>

                <div class="foot-col">
                  <h4>{t('foot.colophon')}</h4>
                  <p style="font-size: 0.88em;">
                    Cloudflare Workers · Hono · D1.<br />
                    {lang === 'ru' ? 'Шрифты: ' : 'Set in '}
                    <span style="color:var(--gold-400);">Space Grotesk</span>
                    {lang === 'ru' ? ', Inter и JetBrains Mono.' : ', Inter & JetBrains Mono.'}
                  </p>
                </div>
              </div>

              <div class="foot-bottom">
                <span>
                  &copy; {currentYear} {owner?.name ?? 'Muhammad Gulomov'}. {t('foot.crafted')}
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
