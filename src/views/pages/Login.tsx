import { raw } from 'hono/html'
import type { SiteProfile } from '../../types'

// Favicon (verbatim from Layout.tsx / head.html)
const FAVICON =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%230a0b0f'/><circle cx='16' cy='16' r='11' fill='none' stroke='%23e8c391' stroke-width='1.4'/><text x='16' y='21' text-anchor='middle' font-family='Georgia' font-weight='500' font-style='italic' fill='%23e8c391' font-size='14'>m</text></svg>"

const BUILD = 'v1'

interface LoginProps {
  owner: SiteProfile | null
  csrf: string
  error?: boolean
  logout?: boolean
}

export function Login({ owner, csrf, error, logout }: LoginProps) {
  const initial = owner?.name && owner.name.trim()
    ? owner.name[0].toLowerCase()
    : 'm'

  return (
    <>
    {raw('<!DOCTYPE html>')}
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#0a0b0f" />
        <title>Sign in{owner?.name ? ` — ${owner.name}` : ''}</title>

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..900,0..100,0..1;1,9..144,300..900,0..100,0..1&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />

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

            <div class="eyebrow">Private</div>
            <h1 class="login-title">Welcome <em>back</em>.</h1>
            <p class="login-sub">Sign in to manage your portfolio.</p>

            {error && (
              <div class="login-alert" role="alert">
                Incorrect username or password.
              </div>
            )}
            {logout && (
              <div class="login-note" role="status">
                You've been signed out.
              </div>
            )}

            <form method="post" action="/login" class="login-form">
              <div class="field">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" autocomplete="username" required autofocus />
              </div>
              <div class="field">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" autocomplete="current-password" required />
              </div>
              <input type="hidden" name="_csrf" value={csrf} />
              <button type="submit" class="btn primary login-submit">
                <span>Sign in</span> <span class="arrow">→</span>
              </button>
            </form>

            <a href="/" class="login-back">← Back to site</a>
          </div>
        </main>
      </body>
    </html>
    </>
  )
}
