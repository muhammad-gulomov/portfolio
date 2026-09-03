import { raw } from 'hono/html'
import type { SiteProfile } from '../../types'

type Lang = 'en' | 'ru'
type TFn = (key: string, ...args: (string | number)[]) => string

// Favicon (verbatim from Layout.tsx)
const FAVICON =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%230b0e14'/><rect x='5' y='5' width='22' height='22' rx='6' fill='none' stroke='%232ee6a6' stroke-width='1.4'/><text x='16' y='21' text-anchor='middle' font-family='Arial' font-weight='700' fill='%232ee6a6' font-size='14'>m</text></svg>"

const BUILD = 'v2028e'

const THEME_BOOT = `(function(){var t;try{t=localStorage.getItem('theme')}catch(e){}if(t!=='light'&&t!=='dark'){t='light'}document.documentElement.setAttribute('data-theme',t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='dark'?'#0b0e14':'#fafafa')})();`

interface LoginProps {
  owner: SiteProfile | null
  csrf: string
  t: TFn
  lang: Lang
  error?: boolean
  logout?: boolean
}

export function Login({ owner, csrf, t, lang, error, logout }: LoginProps) {
  const initial = owner?.name && owner.name.trim()
    ? owner.name[0].toLowerCase()
    : 'm'

  return (
    <>
    {raw('<!DOCTYPE html>')}
    <html lang={lang}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#0b0e14" />
        {raw(`<script>${THEME_BOOT}</script>`)}
        <title>{t('page.login')}{owner?.name ? ` — ${owner.name}` : ''}</title>
        <link rel="stylesheet" href={`/css/base.css?v=${BUILD}`} />
        <link rel="stylesheet" href={`/css/admin.css?v=${BUILD}`} />

        <link rel="icon" href={FAVICON} />
      </head>
      <body>
        <div class="grain" aria-hidden="true"></div>

        <main class="login-shell">
          <div class="login-card">
            <a href="/" class="login-mark" aria-label="Home">
              <em>{initial}</em>
            </a>

            <div class="eyebrow">{t('login.private')}</div>
            <h1 class="login-title">{raw(t('login.title'))}</h1>
            <p class="login-sub">{t('login.sub')}</p>

            {error && (
              <div class="login-alert" role="alert">
                {t('login.error')}
              </div>
            )}
            {logout && (
              <div class="login-note" role="status">
                {t('login.signedout')}
              </div>
            )}

            <form method="post" action="/login" class="login-form">
              <div class="field">
                <label for="username">{t('login.username')}</label>
                <input type="text" id="username" name="username" autocomplete="username" required autofocus />
              </div>
              <div class="field">
                <label for="password">{t('login.password')}</label>
                <input type="password" id="password" name="password" autocomplete="current-password" required />
              </div>
              <input type="hidden" name="_csrf" value={csrf} />
              <button type="submit" class="btn primary login-submit">
                <span>{t('login.submit')}</span> <span class="arrow">→</span>
              </button>
            </form>

            <a href="/" class="login-back">{t('login.back')}</a>
          </div>
        </main>
      </body>
    </html>
    </>
  )
}
