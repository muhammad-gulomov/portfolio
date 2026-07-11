const te = new TextEncoder()
const toHex = (b: ArrayBuffer): string =>
  [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')

async function pbkdf2(password: string, saltHex: string): Promise<string> {
  const salt = Uint8Array.from((saltHex.match(/../g) ?? []).map((h) => parseInt(h, 16)))
  const key = await crypto.subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 }, key, 256)
  return toHex(bits)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = toHex(salt.buffer)
  return `${saltHex}:${await pbkdf2(password, saltHex)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':')
  if (parts.length !== 2) return false
  const [saltHex, expected] = parts
  if (!saltHex || !expected) return false
  const actual = await pbkdf2(password, saltHex)
  const a = te.encode(actual), b = te.encode(expected)
  if (a.byteLength !== b.byteLength) return false
  return crypto.subtle.timingSafeEqual(a, b)
}
