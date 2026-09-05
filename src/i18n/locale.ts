import type { Context, Next } from 'hono'
import { t as translate } from './messages'

declare module 'hono' {
  interface ContextVariableMap {
    t: (key: string, ...args: (string | number)[]) => string
  }
}

export async function localeMiddleware(c: Context, next: Next) {
  c.set('t', (key: string, ...args: (string | number)[]) => translate('en', key, ...args))
  await next()
}
