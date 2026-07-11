/**
 * Layout smoke tests.
 *
 * The full layout (topbar, footer, CSS links, reveal.js) is verified by the
 * page-route tests that use c.render() (tasks 11+). Here we only confirm that
 * wiring the jsxRenderer + global middleware didn't break the existing health
 * check route.
 */
import { SELF } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'

describe('layout middleware', () => {
  it('GET /healthz → 200 ok (unaffected by middleware)', async () => {
    const res = await SELF.fetch('https://x/healthz')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })
})
