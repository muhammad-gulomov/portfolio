import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../src/auth/password'

describe('password', () => {
  it('round-trips', async () => {
    const h = await hashPassword('s3cret')
    expect(h).toMatch(/^[0-9a-f]+:[0-9a-f]+$/)
    expect(await verifyPassword('s3cret', h)).toBe(true)
    expect(await verifyPassword('wrong', h)).toBe(false)
  })

  it('returns false for malformed stored value (no colon)', async () => {
    expect(await verifyPassword('x', 'garbage-no-colon')).toBe(false)
  })

  it('returns false for a stored value with extra colons', async () => {
    expect(await verifyPassword('x', 'aa:bb:cc')).toBe(false)
  })
})
