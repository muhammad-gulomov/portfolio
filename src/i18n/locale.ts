import type { Context, Next } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import type { Lang } from './messages'
import { t as translate } from './messages'

declare module 'hono' {
  interface ContextVariableMap {
    lang: Lang
    t: (key: string, ...args: (string | number)[]) => string
  }
}

export async function localeMiddleware(c: Context, next: Next) {
  const param = c.req.query('lang')
  let lang: Lang = 'en'
  if (param === 'ru' || param === 'en') {
    lang = param
    setCookie(c, 'lang', lang, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'Lax' })
  } else {
    const cookie = getCookie(c, 'lang')
    if (cookie === 'ru' || cookie === 'en') lang = cookie
  }
  c.set('lang', lang)
  c.set('t', (key: string, ...args: (string | number)[]) => translate(lang, key, ...args))
  await next()
}
