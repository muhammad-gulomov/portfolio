import { countAccounts, seedAccount } from './db/account'
import { hashPassword } from './auth/password'

/**
 * If no admin account exists, seed one with the given bootstrapPassword.
 * Idempotent: the INSERT in seedAccount uses OR IGNORE, so concurrent calls
 * during a cold-start race are harmless.
 */
export async function ensureAdmin(db: D1Database, bootstrapPassword: string): Promise<void> {
  if ((await countAccounts(db)) === 0) {
    await seedAccount(db, 'muhammad', await hashPassword(bootstrapPassword))
  }
}
