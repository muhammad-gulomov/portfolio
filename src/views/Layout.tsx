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

const BUILD = 'v2028h'

const GROUND_LIGHT = '#f3f6f4'
const GROUND_DARK = '#000000'

// The M is drawn as a path, not an SVG <text> element. Text in a favicon
// renders in whatever font the OS picks — never the site's face, and mushy at
// 16px. Round caps and joins match the stroke icons already in the topbar.
const FAVICON =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
  "<rect width='32' height='32' rx='6' fill='%230a7a55'/>" +
  "<path d='M8 23V10l8 8 8-8v13' fill='none' stroke='%23f3f6f4' stroke-width='3'" +
  " stroke-linecap='round' stroke-linejoin='round'/></svg>"

// Runs before first paint so a dark-theme visitor never sees a light flash.
// Kept inline and tiny for that reason — an external file would load too late.
// Runs in <head>, before the browser would restore a saved scroll position.
// Without this, reloading or navigating back to a one-page site can land the
// reader on the footer instead of the page. It does NOT affect returning from
// another app — that page was never unloaded, so nothing is being "restored".
const SCROLL_BOOT =
  `try{if('scrollRestoration' in history){history.scrollRestoration='manual'}}catch(e){}`

const THEME_BOOT =
  `(function(){var t;try{t=localStorage.getItem('theme')}catch(e){}` +
  `if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}` +
  `document.documentElement.setAttribute('data-theme',t);` +
  `var m=document.querySelector('meta[name="theme-color"]');` +
  `if(m)m.setAttribute('content',t==='dark'?'${GROUND_DARK}':'${GROUND_LIGHT}')})();`


/**
 * Stylesheets are inlined into the document rather than linked.
 *
 * Linked CSS costs a full extra round-trip that cannot be started until the
 * HTML has already arrived and been parsed — the browser cannot know a file
 * it has not yet been told about. Measured against the edge that was ~354ms
 * of render-blocking dead time on a cold visit, roughly half of first paint,
 * to save ~6KB that a one-page site re-uses nowhere.
 *
 * Read through the ASSETS binding (an edge-local lookup, no public request)
 * and memoised for the life of the isolate, so only the first request after
 * a cold start does any work. On failure we fall back to a <link>, which is
 * merely the old behaviour rather than an unstyled page.
 */
const cssCache = new Map<string, string>()

/** Test seam: the cache lives as long as the isolate, which a deploy replaces. */
export function clearCssCache(): void { cssCache.clear() }

async function loadCss(c: any, names: string[]): Promise<string | null> {
  try {
    const parts: string[] = []
    for (const name of names) {
      const cached = cssCache.get(name)
      if (cached !== undefined) { parts.push(cached); continue }

      const res = await c.env.ASSETS.fetch(new URL(`/css/${name}.css`, c.req.url))
      if (!res.ok) return null
      const text: string = await res.text()
      cssCache.set(name, text)
      parts.push(text)
    }
    return parts.join('\n')
  } catch {
    return null
  }
}

export default jsxRenderer(
  async (
    { children, title, meta, css }: {
      children?: unknown
      title: string
      meta?: string
      css?: string
    },
    c,
  ) => {
    const sheets = ['base', ...(css ? [css] : [])]
    const inlineCss = await loadCss(c, sheets)

    const owner = c.get('owner') as SiteProfile
    const lang = (c.get('lang') as Lang) ?? 'en'
    const t = c.get('t') as (key: string, ...args: (string | number)[]) => string

    // The home route passes the owner's name as its title, so appending the
    // owner again produced "Muhammad Gulomov — Muhammad Gulomov" in the tab.
    const pageTitle = !title
      ? t('page.home')
      : owner?.name && title !== owner.name
        ? `${title} — ${owner.name}`
        : title

    const description = meta ?? (
      owner?.name ? `${owner.name} — ${t('meta.fallback')}` : t('meta.fallback')
    )

    return (
      <html lang={lang}>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="theme-color" content={GROUND_LIGHT} />
          {raw(`<script>${SCROLL_BOOT}${THEME_BOOT}</script>`)}
          <meta name="description" content={description} />
          <title>{pageTitle}</title>

          {/* Self-hosted, so there is no third-party origin to resolve and no
              CSS round-trip standing between the browser and the font file.
              crossorigin is required even same-origin: fonts always fetch in
              CORS mode, and without it the preload is discarded and fetched
              a second time. */}
          <link
            rel="preload"
            href="/fonts/figtree-latin.woff2"
            as="font"
            type="font/woff2"
            crossorigin=""
          />
          {lang === 'ru' && (
            <link
              rel="preload"
              href="/fonts/plex-cyrillic.woff2"
              as="font"
              type="font/woff2"
              crossorigin=""
            />
          )}

          {inlineCss !== null
            ? raw(`<style>${inlineCss}</style>`)
            : (
              <>
                <link rel="stylesheet" href={`/css/base.css?v=${BUILD}`} />
                {css && <link rel="stylesheet" href={`/css/${css}.css?v=${BUILD}`} />}
              </>
            )}

          <link rel="icon" href={FAVICON} />
        </head>
        <body>
          <a class="skip-link" href="#main">{t('nav.skip')}</a>

          <header class="topbar">
            {/* On the home page this is the document's h1 — the site's one
                real heading. Elsewhere it is just a link back, so admin and
                login keep their own h1 as the page heading. */}
            {css === 'home'
              ? <h1 class="brand"><a href="/">{owner?.name ?? 'Muhammad Gulomov'}</a></h1>
              : <span class="brand"><a href="/">{owner?.name ?? 'Muhammad Gulomov'}</a></span>}

            <div class="utility">
            <div class="lang">
              <button
                class="lang-trigger"
                type="button"
                aria-haspopup="listbox"
                aria-expanded="false"
                aria-label={t('nav.lang')}
                data-lang-trigger
              >
                <span class="flag" aria-hidden="true">{lang === 'ru' ? '\u{1F1F7}\u{1F1FA}' : '\u{1F1EC}\u{1F1E7}'}</span>
                {raw(`<svg class="chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`)}
              </button>

              <ul class="lang-menu" role="listbox" hidden data-lang-menu>
                <li>
                  <a href="?lang=en" role="option" aria-selected={lang !== 'ru' ? 'true' : 'false'}
                     class={lang !== 'ru' ? 'active' : ''} lang="en">
                    <span class="flag" aria-hidden="true">{'\u{1F1EC}\u{1F1E7}'}</span>
                    <span>English</span>
                  </a>
                </li>
                <li>
                  <a href="?lang=ru" role="option" aria-selected={lang === 'ru' ? 'true' : 'false'}
                     class={lang === 'ru' ? 'active' : ''} lang="ru">
                    <span class="flag" aria-hidden="true">{'\u{1F1F7}\u{1F1FA}'}</span>
                    <span>Русский</span>
                  </a>
                </li>
              </ul>
            </div>

              <button class="theme-toggle" type="button" aria-label={t('nav.theme')} data-theme-toggle>
                {raw(`<svg class="icon-sun" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`)}
                {raw(`<svg class="icon-moon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`)}
              </button>

            </div>
          </header>

          <main id="main">{children}</main>

          {/* Shown by script only when the page actually overflows, so it never
              claims there is more to see when there is not. aria-hidden because
              it is a visual affordance — a screen reader already knows the
              document continues. */}
          <div class="scroll-cue" hidden aria-hidden="true" data-scroll-cue>
            {raw(`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`)}
          </div>


          <script src={`/js/site.js?v=${BUILD}`} defer></script>
        </body>
      </html>
    )
  },
  { docType: true },
)
