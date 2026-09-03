// Worker bindings + secrets, declared once on Cloudflare's global Env namespace
// so `env` from `cloudflare:workers` is typed without running `wrangler types`.
// The module-level `Env` alias is what handlers import.
declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database
      BUCKET: R2Bucket
      ASSETS: Fetcher
      SESSION_SECRET: string
      ADMIN_BOOTSTRAP_PASSWORD: string
      TELEGRAM_BOT_TOKEN?: string
      TELEGRAM_WEBHOOK_SECRET?: string
      TELEGRAM_ADMIN_IDS?: string
    }
  }
}
export type Env = Cloudflare.Env
export interface SiteProfile {
  name: string; handle: string; tagline: string; location: string; email: string
  github: string; linkedin: string; telegram: string; instagram: string; photoPath: string | null
}
export interface WorkExperience {
  id: number; company: string; role: string; location: string | null
  startDate: string; endDate: string | null; summary: string | null; tech: string | null
  url: string | null; projectLinks: string | null; displayOrder: number
}
export interface BlogPost {
  id: number; slug: string; title: string; excerpt: string | null; content: string
  publishedAt: string; readingMinutes: number; views: number; published: number // 0|1
}
export interface AdminAccount { id: number; username: string; passwordHash: string }
// Hono context variables set by global middleware
export type Vars = {
  owner: SiteProfile
  currentYear: number
  csrf?: string
  lang: 'en' | 'ru'
  t: (key: string, ...args: (string | number)[]) => string
}
