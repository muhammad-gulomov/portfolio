import { env } from 'cloudflare:workers'
import { describe, it, expect } from 'vitest'
describe('schema', () => {
  it('has all tables', async () => {
    const { results } = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all<{name:string}>()
    const names = results.map(r => r.name)
    for (const t of ['admin_account','blog_posts','projects','site_profile','work_experiences'])
      expect(names).toContain(t)
  })
})
