import { SELF } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'
describe('health', () => {
  it('GET /healthz → 200 ok', async () => {
    const res = await SELF.fetch('https://x/healthz')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })
})
