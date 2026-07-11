import { Hono } from 'hono'
import type { Env, Vars } from '../types'
import { issueCsrf, verifyCsrf } from '../auth/csrf'
import { setSession, clearSession } from '../auth/session'
import { getAccount } from '../db/account'
import { verifyPassword } from '../auth/password'
import { Login } from '../views/pages/Login'

const auth = new Hono<{ Bindings: Env; Variables: Vars }>()

auth.get('/login', async (c) => {
  const csrf = await issueCsrf(c, c.env.SESSION_SECRET)
  const error = !!c.req.query('error')
  const logout = !!c.req.query('logout')
  return c.html(
    <Login owner={c.get('owner')} csrf={csrf} error={error} logout={logout} />,
  )
})

auth.post('/login', async (c) => {
  if (!(await verifyCsrf(c, c.env.SESSION_SECRET))) {
    return c.redirect('/login?error=1')
  }
  const body = await c.req.parseBody()
  const username = typeof body.username === 'string' ? body.username : ''
  const password = typeof body.password === 'string' ? body.password : ''

  const acct = await getAccount(c.env.DB)
  if (acct && acct.username === username && await verifyPassword(password, acct.passwordHash)) {
    await setSession(c, c.env.SESSION_SECRET)
    return c.redirect('/admin')
  }
  return c.redirect('/login?error=1')
})

auth.post('/logout', async (c) => {
  clearSession(c)
  return c.redirect('/')
})

export default auth
