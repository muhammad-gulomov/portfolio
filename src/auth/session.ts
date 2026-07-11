import { setSignedCookie, getSignedCookie, deleteCookie } from 'hono/cookie'
import type { Context } from 'hono'
import type { Env, Vars } from '../types'

type AppContext = Context<{ Bindings: Env; Variables: Vars }>

export async function setSession(c: AppContext, secret: string): Promise<void> {
  const secure = new URL(c.req.url).protocol === 'https:'
  await setSignedCookie(c, 'session', 'admin', secret, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })
}

export function clearSession(c: AppContext): void {
  deleteCookie(c, 'session', { path: '/' })
}

export async function isAuthenticated(c: AppContext, secret: string): Promise<boolean> {
  return (await getSignedCookie(c, secret, 'session')) === 'admin'
}
