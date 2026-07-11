import type { MiddlewareHandler } from 'hono'
import type { Env, Vars } from '../types'
import { isAuthenticated } from './session'

export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: Vars }> = async (c, next) => {
  if (!(await isAuthenticated(c, c.env.SESSION_SECRET))) {
    return c.redirect('/login', 302)
  }
  await next()
}
