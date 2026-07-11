import { describe, it, expect } from 'vitest'
import { slugify, excerptFrom, readingMinutes } from '../src/content/derive'
describe('derive', () => {
  it('slugify', () => {
    expect(slugify('Hello, World!')).toBe('hello-world')
    expect(slugify('  Multiple   spaces ')).toBe('multiple-spaces')
    expect(slugify('!!!')).toBe('post')
  })

  it('slugify strips diacritics via NFD normalize', () => {
    expect(slugify('Café Déjà')).toBe('cafe-deja')
  })

  it('excerptFrom truncates to 220 + …', () => {
    const long = 'word '.repeat(100)
    const ex = excerptFrom(long)
    expect(ex.length).toBeLessThanOrEqual(221)
    expect(ex.endsWith('…')).toBe(true)
  })

  it('excerptFrom boundary: 220 chars unchanged, 221 chars truncated', () => {
    const at220 = 'a'.repeat(220)
    const at221 = 'a'.repeat(221)

    const result220 = excerptFrom(at220)
    expect(result220.length).toBe(220)
    expect(result220.endsWith('…')).toBe(false)
    expect(result220).toBe(at220)

    const result221 = excerptFrom(at221)
    expect(result221.length).toBe(221) // 220 chars + 1 for '…' (multi-byte but .length is 1)
    expect(result221.endsWith('…')).toBe(true)
    expect(result221.slice(0, 220)).toBe('a'.repeat(220))
  })

  it('readingMinutes ≥ 1', () => {
    expect(readingMinutes('a b c')).toBe(1)
    expect(readingMinutes('word '.repeat(440))).toBe(2)
  })

  it('readingMinutes boundary: 220 words → 1, 221 words → 2', () => {
    const at220 = ('word '.repeat(220)).trim()
    const at221 = ('word '.repeat(221)).trim()
    expect(readingMinutes(at220)).toBe(1)
    expect(readingMinutes(at221)).toBe(2)
  })
})
