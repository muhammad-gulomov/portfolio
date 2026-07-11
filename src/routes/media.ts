import { Hono } from 'hono'
import type { Env, Vars } from '../types'
import { getPhoto } from '../media/photo'

const mediaRoutes = new Hono<{ Bindings: Env; Variables: Vars }>()

mediaRoutes.get('/media/profile-photo', async (c) => {
  const obj = await getPhoto(c.env.BUCKET)
  if (!obj) return c.notFound()

  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('etag', obj.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  return new Response(obj.body, { headers })
})

export default mediaRoutes
