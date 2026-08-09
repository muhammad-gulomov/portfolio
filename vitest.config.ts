import path from 'node:path'
import { configDefaults, defineConfig } from 'vitest/config'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(path.join(__dirname, 'migrations'))
      return {
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          d1Databases: ['DB'],
          r2Buckets: ['BUCKET'],
          bindings: {
            TEST_MIGRATIONS: migrations,
            TELEGRAM_BOT_TOKEN: 'test-bot-token',
            TELEGRAM_WEBHOOK_SECRET: 'test-webhook-secret',
            TELEGRAM_ADMIN_IDS: '111',
          },
        },
      }
    }),
  ],
  test: {
    setupFiles: ['./test/apply-migrations.ts'],
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
})
