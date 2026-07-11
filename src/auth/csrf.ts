import { setSignedCookie, getSignedCookie } from 'hono/cookie'
import type { Context } from 'hono'
import type { Env, Vars } from '../types'

type AppContext = Context<{ Bindings: Env; Variables: Vars }>

export async function issueCsrf(c: AppContext, secret: string): Promise<string> {
  const token = crypto.randomUUID()
  const secure = new URL(c.req.url).protocol === 'https:'
  await setSignedCookie(c, 'csrf', token, secret, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 h — matches session cookie bound
  })
  return token
}

export async function verifyCsrf(c: AppContext, secret: string): Promise<boolean> {
  // Defense-in-depth: reject cross-origin requests when Origin header is present.
  // We check Origin (not Referer) because Referer is stripped or omitted under
  // strict Referrer-Policy settings, making it an unreliable fallback. Origin is
  // the authoritative header browsers send for cross-origin POST requests.
  const origin = c.req.header('origin')
  if (origin) {
    const requestHost = new URL(c.req.url).host
    const originHost = new URL(origin).host
    if (requestHost !== originHost) return false
  }

  const body = await c.req.parseBody()
  const submittedToken = body['_csrf']
  if (!submittedToken || typeof submittedToken !== 'string') return false

  const cookieToken = await getSignedCookie(c, secret, 'csrf')
  if (!cookieToken) return false

  return submittedToken === cookieToken
}
