import { env } from 'cloudflare:workers'
import { describe, it, expect } from 'vitest'
import type { Env } from '../src/types'
import { putPhoto, getPhoto } from '../src/media/photo'

const bucket = (env as unknown as Env).BUCKET

describe('media / R2 photo', () => {
  it('putPhoto then getPhoto returns object with matching contentType', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'p.png', { type: 'image/png' })
    await putPhoto(bucket, file)
    const obj = await getPhoto(bucket)
    expect(obj).not.toBeNull()
    expect(obj!.httpMetadata?.contentType).toBe('image/png')
  })

  it('rejects a non-image file with "Only image files are allowed"', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'doc.txt', { type: 'text/plain' })
    await expect(putPhoto(bucket, file)).rejects.toThrow('Only image files are allowed')
  })

  it('rejects an empty file with "No file to store"', async () => {
    const file = new File([], 'e.png', { type: 'image/png' })
    await expect(putPhoto(bucket, file)).rejects.toThrow('No file to store')
  })

  it('rejects an oversized file with "File too large"', async () => {
    // 5MB + 1 byte exceeds the limit
    const bigData = new Uint8Array(5 * 1024 * 1024 + 1)
    const file = new File([bigData], 'big.png', { type: 'image/png' })
    await expect(putPhoto(bucket, file)).rejects.toThrow('File too large')
  })
})
