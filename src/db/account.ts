import type { AdminAccount } from '../types'

export async function getAccount(db: D1Database): Promise<AdminAccount | null> {
  return db
    .prepare(
      'SELECT id, username, password_hash AS passwordHash FROM admin_account WHERE id = 1',
    )
    .first<AdminAccount>()
}

export async function countAccounts(db: D1Database): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM admin_account')
    .first<{ n: number }>()
  return row?.n ?? 0
}

export async function seedAccount(
  db: D1Database,
  username: string,
  passwordHash: string,
): Promise<void> {
  await db
    .prepare(
      'INSERT OR IGNORE INTO admin_account (id, username, password_hash) VALUES (1, ?, ?)',
    )
    .bind(username, passwordHash)
    .run()
}

export async function updateCredentials(
  db: D1Database,
  fields: { username?: string; passwordHash?: string },
): Promise<void> {
  const parts: string[] = []
  const values: string[] = []

  if (fields.username !== undefined) {
    parts.push('username = ?')
    values.push(fields.username)
  }
  if (fields.passwordHash !== undefined) {
    parts.push('password_hash = ?')
    values.push(fields.passwordHash)
  }

  if (parts.length === 0) return // no-op

  await db
    .prepare(`UPDATE admin_account SET ${parts.join(', ')} WHERE id = 1`)
    .bind(...values)
    .run()
}
