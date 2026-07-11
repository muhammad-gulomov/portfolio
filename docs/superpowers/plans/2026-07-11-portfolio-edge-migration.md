# Portfolio Edge Re-Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-platform the Spring Boot portfolio to Cloudflare Workers + Hono + D1 + R2 so it opens instantly (edge isolates, no cold-start sleep), stays free, keeps the live admin panel, and looks byte-identical.

**Architecture:** A Hono app runs on Workers as the sole dynamic origin. Static CSS/JS/favicon are served directly from `public/` by Cloudflare's asset layer (assets match first, everything else falls through to the Worker). Structured data lives in D1 (SQLite); the single profile photo lives in R2. Server-rendered Hono JSX reproduces the existing Thymeleaf markup exactly so the ported CSS + `reveal.js` work unchanged. Auth is a signed cookie session + PBKDF2 (Web Crypto); the admin row is bootstrapped on first request from a Workers secret.

**Tech Stack:** TypeScript, Hono (+ `hono/jsx`, `jsx-renderer`), Cloudflare Workers/D1/R2, Wrangler, `markdown-it` + `ultrahtml` (sanitize), Vitest + `@cloudflare/vitest-pool-workers`.

## Global Constraints

- **Runtime:** Cloudflare Workers (V8 isolate). No Node built-ins. **Do NOT add `nodejs_compat`** — `markdown-it` and `ultrahtml` are pure JS and don't need it.
- **Versions:** `vitest@^4.1.0` with `@cloudflare/vitest-pool-workers` (requires Vitest ≥ 4.1); use the `cloudflareTest()` plugin config API (not legacy `defineWorkersConfig`).
- **`compatibility_date`:** `"2026-07-06"` (pinned, don't float).
- **Bindings (exact names):** `DB` (D1), `BUCKET` (R2), `ASSETS` (static). Secrets: `SESSION_SECRET`, `ADMIN_BOOTSTRAP_PASSWORD`.
- **tsconfig JSX:** `"jsx": "react-jsx"`, `"jsxImportSource": "hono/jsx"`.
- **Sanitized HTML in JSX:** inject with `raw()` from `hono/html` (never `dangerouslySetInnerHTML`).
- **`public/` holds ONLY real static files** (`css/`, `js/`, `favicon.ico`, images) — no file may share a path with a Hono route, or the asset layer will shadow it.
- **Singletons** `site_profile`, `admin_account` use fixed `id = 1`. Dates stored as ISO **TEXT**; booleans as `INTEGER` 0/1.
- **Never commit secrets:** `.dev.vars*`, any `salt:hash`, `.wrangler/` are gitignored. Admin password hash is bootstrapped in-Worker, never written to a committed file.
- **Faithful port:** reproduce Thymeleaf markup class-for-class from the source app at `~/Desktop/Library/java/portfolio` (`src/main/resources/templates/`). No redesign.
- **Domain:** `kanzen.uz` + `www.kanzen.uz` attached as Workers Custom Domains at cutover.

## Shared Types (defined once, referenced by all tasks)

`src/types.ts` — domain interfaces. Repos alias snake_case columns to these camelCase names via `SELECT ... AS`.

```ts
export interface Env {
  DB: D1Database
  BUCKET: R2Bucket
  ASSETS: Fetcher
  SESSION_SECRET: string
  ADMIN_BOOTSTRAP_PASSWORD: string
}
export interface SiteProfile {
  name: string; handle: string; tagline: string; location: string; email: string
  github: string; linkedin: string; telegram: string; instagram: string; photoPath: string | null
}
export interface WorkExperience {
  id: number; company: string; role: string; location: string | null
  startDate: string; endDate: string | null; summary: string | null; tech: string | null
  url: string | null; projectLinks: string | null; displayOrder: number
}
export interface Project {
  id: number; name: string; tagline: string | null; description: string | null; tech: string | null
  url: string | null; githubUrl: string | null; imageUrl: string | null; displayOrder: number
}
export interface BlogPost {
  id: number; slug: string; title: string; excerpt: string | null; content: string
  publishedAt: string; readingMinutes: number; views: number; published: number // 0|1
}
export interface AdminAccount { id: number; username: string; passwordHash: string }
// Hono context variables set by global middleware
export type Vars = { owner: SiteProfile; currentYear: number; csrf?: string }
```

## File Structure

```
wrangler.jsonc            bindings, assets, custom domains
tsconfig.json             hono/jsx settings
package.json              deps + scripts
vitest.config.ts          cloudflareTest() plugin + migrations
.dev.vars                 local SESSION_SECRET + ADMIN_BOOTSTRAP_PASSWORD (gitignored)
.gitignore
migrations/0000_init.sql  5 tables
seed.sql                  non-secret content ported from Runner.java (committed)
test/apply-migrations.ts  applyD1Migrations setup
test/env.d.ts             ProvidedEnv augmentation
src/
  index.ts                app assembly, global middleware, route mounting, default export
  types.ts                interfaces above
  db/{profile,account,work,project,blog}.ts   one repo per table
  content/{derive,markdown}.ts                 pure logic
  auth/{password,session,csrf,guard}.ts        auth primitives + middleware
  media/photo.ts          R2 put/get
  bootstrap.ts            seed admin_account on first request
  views/
    Layout.tsx            root jsxRenderer layout (Head/Header/Footer inline)
    pages/{Home,BlogList,BlogPost,Login}.tsx
    admin/{Dashboard,PostForm,WorkForm,ProjectForm,ProfileForm}.tsx
  routes/{public,blog,auth,admin,media}.ts
public/                   base/home/blog/admin.css, reveal.js, favicon  (copied verbatim)
```

---

### Task 1: Project scaffold, Wrangler config, and test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `wrangler.jsonc`, `vitest.config.ts`, `.gitignore`, `.dev.vars`, `src/index.ts`, `src/types.ts`, `test/apply-migrations.ts`, `test/env.d.ts`
- Test: `test/health.test.ts`

**Interfaces:**
- Produces: default-exported Hono `app` from `src/index.ts`; `Env`/`Vars` types from `src/types.ts`; a working `GET /healthz` returning `200 "ok"`.

- [ ] **Step 1: Init npm + install deps**

```bash
cd ~/Desktop/Library/js/portfolio
npm init -y
npm install hono markdown-it ultrahtml
npm install -D typescript wrangler vitest@^4.1.0 @cloudflare/vitest-pool-workers @types/markdown-it
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "esnext", "module": "esnext", "moduleResolution": "bundler",
    "lib": ["esnext"], "types": ["@cloudflare/vitest-pool-workers/types"],
    "jsx": "react-jsx", "jsxImportSource": "hono/jsx",
    "strict": true, "skipLibCheck": true, "noEmit": true
  },
  "include": ["src", "test", "worker-configuration.d.ts"]
}
```

- [ ] **Step 3: Write `wrangler.jsonc`** (custom-domain routes stay commented until cutover)

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "kanzen",
  "main": "./src/index.ts",
  "compatibility_date": "2026-07-06",
  "assets": { "directory": "./public", "binding": "ASSETS", "not_found_handling": "none" },
  "d1_databases": [
    { "binding": "DB", "database_name": "kanzen-db", "database_id": "PLACEHOLDER", "migrations_dir": "migrations" }
  ],
  "r2_buckets": [{ "binding": "BUCKET", "bucket_name": "kanzen-assets" }]
  // "routes": [
  //   { "pattern": "kanzen.uz", "custom_domain": true },
  //   { "pattern": "www.kanzen.uz", "custom_domain": true }
  // ]
}
```

- [ ] **Step 4: Write `src/types.ts`** — paste the Shared Types block above.

- [ ] **Step 5: Write `.gitignore` and `.dev.vars`**

```gitignore
node_modules/
.wrangler/
.dev.vars*
*.secret.sql
worker-configuration.d.ts
```

```bash
# .dev.vars  (gitignored)
SESSION_SECRET="dev-only-change-me"
ADMIN_BOOTSTRAP_PASSWORD="portfolio-admin"
```

- [ ] **Step 6: Write minimal `src/index.ts`**

```ts
import { Hono } from 'hono'
import type { Env, Vars } from './types'

const app = new Hono<{ Bindings: Env; Variables: Vars }>()

app.get('/healthz', async (c) => {
  try { await c.env.DB.prepare('SELECT 1').first(); return c.text('ok') }
  catch { return c.text('db unavailable', 503) }
})

export default app
```

- [ ] **Step 7: Write `vitest.config.ts`**

```ts
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { readD1Migrations } from '@cloudflare/vitest-pool-workers/config'

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(path.join(__dirname, 'migrations'))
      return {
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: { d1Databases: ['DB'], r2Buckets: ['BUCKET'], bindings: { TEST_MIGRATIONS: migrations } },
      }
    }),
  ],
  test: { setupFiles: ['./test/apply-migrations.ts'] },
})
```

- [ ] **Step 8: Write `test/apply-migrations.ts` and `test/env.d.ts`**

```ts
// test/apply-migrations.ts
import { env } from 'cloudflare:workers'
import { applyD1Migrations } from 'cloudflare:test'
await applyD1Migrations(env.DB, (env as any).TEST_MIGRATIONS)
```

```ts
// test/env.d.ts
import type { D1Migration } from '@cloudflare/vitest-pool-workers/config'
declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env { TEST_MIGRATIONS: D1Migration[] }
}
```

- [ ] **Step 9: Add scripts to `package.json`**

```json
"scripts": {
  "dev": "wrangler dev",
  "test": "vitest run",
  "deploy": "wrangler deploy",
  "types": "wrangler types"
}
```

- [ ] **Step 10: Write failing test `test/health.test.ts`**

```ts
import { SELF } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'
describe('health', () => {
  it('GET /healthz → 200 ok', async () => {
    const res = await SELF.fetch('https://x/healthz')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })
})
```

- [ ] **Step 11: Run — expect PASS** (Task 2's migration makes `SELECT 1` valid even with no tables). Run: `npm test`. If the D1 binding errors before migrations exist, proceed to Task 2 then re-run; this test must pass by end of Task 2.

- [ ] **Step 12: Commit**

```bash
git add -A && git commit -m "chore: scaffold Hono/Workers project + test harness"
```

---

### Task 2: D1 schema migration

**Files:** Create `migrations/0000_init.sql`; Test `test/schema.test.ts`

**Interfaces:** Produces the five tables (see Shared Types for columns).

- [ ] **Step 1: Create migration**

```bash
npx wrangler d1 migrations create kanzen-db "init schema"
# then write the SQL below into the generated migrations/0000_*.sql
```

- [ ] **Step 2: Write the schema SQL** (paste the full `CREATE TABLE` block from the design spec: `site_profile`, `work_experiences`, `projects`, `blog_posts`, `admin_account` — columns and constraints exactly as specified).

- [ ] **Step 3: Write failing test `test/schema.test.ts`**

```ts
import { env } from 'cloudflare:workers'
import { describe, it, expect } from 'vitest'
describe('schema', () => {
  it('has all tables', async () => {
    const { results } = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all<{name:string}>()
    const names = results.map(r => r.name)
    for (const t of ['admin_account','blog_posts','projects','site_profile','work_experiences'])
      expect(names).toContain(t)
  })
})
```

- [ ] **Step 4: Run — expect PASS** (migrations applied by setup). Run: `npm test`. Also confirm Task 1's health test now passes.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: D1 schema migration"`

---

### Task 3: Content derivations (slug / excerpt / reading time)

**Files:** Create `src/content/derive.ts`; Test `test/derive.test.ts`

**Interfaces:** Produces `slugify(s: string): string`, `excerptFrom(md: string): string`, `readingMinutes(md: string): number`. Port logic 1:1 from `BlogServiceImpl`/`MarkdownService` (see app map §6): slug = NFD-normalize → strip non-`[\w-]` → lowercase → spaces→`-` → trim `-` → fallback `"post"`; excerpt = strip md punctuation, collapse whitespace, 220-char truncate + `"…"`; readingMinutes = `max(1, ceil(words/220))`.

- [ ] **Step 1: Write failing tests `test/derive.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { slugify, excerptFrom, readingMinutes } from '../src/content/derive'
describe('derive', () => {
  it('slugify', () => {
    expect(slugify('Hello, World!')).toBe('hello-world')
    expect(slugify('  Multiple   spaces ')).toBe('multiple-spaces')
    expect(slugify('!!!')).toBe('post')
  })
  it('excerptFrom truncates to 220 + …', () => {
    const long = 'word '.repeat(100)
    const ex = excerptFrom(long)
    expect(ex.length).toBeLessThanOrEqual(221)
    expect(ex.endsWith('…')).toBe(true)
  })
  it('readingMinutes ≥ 1', () => {
    expect(readingMinutes('a b c')).toBe(1)
    expect(readingMinutes('word '.repeat(440))).toBe(2)
  })
})
```

- [ ] **Step 2: Run — expect FAIL** (`slugify is not a function`). Run: `npm test test/derive.test.ts`
- [ ] **Step 3: Implement `src/content/derive.ts`** (pure functions; no imports needed).
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: content derivations"`

---

### Task 4: Markdown render + sanitize

**Files:** Create `src/content/markdown.ts`; Test `test/markdown.test.ts`

**Interfaces:** Produces `renderMarkdown(src): string`, `sanitizeHtml(dirty): Promise<string>`, `renderPostHtml(src): Promise<string>` (render then sanitize).

- [ ] **Step 1: Write failing tests `test/markdown.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { renderPostHtml } from '../src/content/markdown'
describe('markdown', () => {
  it('renders GFM tables', async () => {
    const html = await renderPostHtml('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('<table>')
  })
  it('autolinks bare URLs', async () => {
    expect(await renderPostHtml('see https://example.com')).toContain('<a href="https://example.com"')
  })
  it('strips <script>', async () => {
    expect(await renderPostHtml('ok <script>alert(1)</script>')).not.toContain('<script>')
  })
})
```

- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement `src/content/markdown.ts`** — use the verified snippet: `markdownit({ html:false, linkify:true, typographer:true })` (GFM tables are on by default); `sanitizeHtml` via `transform(dirty, [sanitize({ allowElements/allowAttributes as in the design })])` from `ultrahtml` + `ultrahtml/transformers/sanitize`; `renderPostHtml = (s) => sanitizeHtml(renderMarkdown(s))`.
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: markdown render + sanitize"`

---

### Task 5: Password hashing (PBKDF2 / Web Crypto)

**Files:** Create `src/auth/password.ts`; Test `test/password.test.ts`

**Interfaces:** Produces `hashPassword(pw): Promise<string>` (returns `"saltHex:hashHex"`), `verifyPassword(pw, stored): Promise<boolean>` (constant-time via `crypto.subtle.timingSafeEqual`). 100k iterations, SHA-256, 16-byte random salt.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../src/auth/password'
describe('password', () => {
  it('round-trips', async () => {
    const h = await hashPassword('s3cret')
    expect(h).toMatch(/^[0-9a-f]+:[0-9a-f]+$/)
    expect(await verifyPassword('s3cret', h)).toBe(true)
    expect(await verifyPassword('wrong', h)).toBe(false)
  })
})
```

- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** using the verified Web-Crypto PBKDF2 snippet (importKey `PBKDF2` → `deriveBits` SHA-256, 100_000 iters, 256 bits; hex-encode salt+hash; `verifyPassword` re-derives with stored salt and `timingSafeEqual`s the hex byte strings).
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: PBKDF2 password hashing"`

---

### Task 6: Sessions, CSRF, and auth guard

**Files:** Create `src/auth/session.ts`, `src/auth/csrf.ts`, `src/auth/guard.ts`; Test `test/auth.test.ts`

**Interfaces:**
- `session.ts`: `setSession(c, secret): Promise<void>` (signed HTTP-only cookie `session=admin`, SameSite=Lax, 8h), `clearSession(c): void`, `isAuthenticated(c, secret): Promise<boolean>`.
- `csrf.ts`: `issueCsrf(c, secret): Promise<string>` (random token, set signed cookie `csrf`, return token for the form), `verifyCsrf(c, secret): Promise<boolean>` (compare submitted `_csrf` field to signed cookie; also require same-origin `Origin`/`Referer`).
- `guard.ts`: `requireAuth(c, next)` middleware — `isAuthenticated` false → `c.redirect('/login', 302)`.

Uses Hono `setSignedCookie`/`getSignedCookie`/`deleteCookie` from `hono/cookie`.

- [ ] **Step 1: Write failing tests** covering: set→isAuthenticated true; tampered cookie → false; guard redirects (302 → `/login`) when no cookie; CSRF verify true for matching token, false for mismatch.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement the three files** per interfaces (signed cookies via `SESSION_SECRET`).
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: sessions, CSRF, auth guard"`

---

### Task 7: DB repos — profile, account, work, project

**Files:** Create `src/db/profile.ts`, `src/db/account.ts`, `src/db/work.ts`, `src/db/project.ts`; Test `test/repos.test.ts`

**Interfaces (exact — later tasks depend on these names):**
- profile: `getProfile(db): Promise<SiteProfile|null>`, `updateProfile(db, p: SiteProfile): Promise<void>` (UPSERT id=1), `setPhotoPath(db, path): Promise<void>`
- account: `getAccount(db): Promise<AdminAccount|null>`, `countAccounts(db): Promise<number>`, `seedAccount(db, username, passwordHash): Promise<void>`, `updateCredentials(db, { username?, passwordHash? }): Promise<void>`
- work: `listWork(db): Promise<WorkExperience[]>` (`ORDER BY display_order ASC, start_date DESC`), `getWork(db, id)`, `saveWork(db, w)` (INSERT when no id else UPDATE), `deleteWork(db, id)`
- project: `listProjects(db)` (`ORDER BY display_order ASC`), `getProject(db, id)`, `saveProject(db, p)`, `deleteProject(db, id)`

All SELECTs alias snake_case → camelCase (e.g. `SELECT start_date AS startDate`). Use prepared statements + `.bind()`.

- [ ] **Step 1: Write failing tests `test/repos.test.ts`** — seed via each repo, assert round-trip and ordering (e.g. two work rows with different `displayOrder` come back ordered; `updateProfile` then `getProfile` returns the values; `saveWork` insert then update preserves id).
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement the four repo modules.**
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: profile/account/work/project repos"`

---

### Task 8: Blog repo

**Files:** Create `src/db/blog.ts`; Test `test/blog-repo.test.ts`

**Interfaces:** `listPublished(db)` (`published=1 ORDER BY published_at DESC`), `listAll(db)` (`ORDER BY published_at DESC`), `latest(db, n)` (published, `LIMIT n`), `getBySlug(db, slug)`, `getById(db, id)`, `savePost(db, p)` (INSERT/UPDATE; on update preserve existing `views`+`published_at`), `deletePost(db, id)`, `incrementViews(db, id)` (`UPDATE ... SET views = views + 1`). `savePost` computes `slug`/`excerpt`/`readingMinutes` via Task 3 helpers when blank.

- [ ] **Step 1: Write failing tests** — save→getBySlug; unpublished excluded from `listPublished`; `incrementViews` bumps count; `latest(2)` respects limit + order; update preserves views.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement `src/db/blog.ts`.**
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: blog repo"`

---

### Task 9: Media (R2 photo)

**Files:** Create `src/media/photo.ts`; Test `test/media.test.ts`

**Interfaces:** `putPhoto(bucket, file: File): Promise<void>` (validate `image/*` + ≤5MB, `bucket.put('profile-photo', file.stream(), { httpMetadata: { contentType: file.type } })`; throw `Error` with the app's messages on invalid), `getPhoto(bucket): Promise<R2ObjectBody|null>` (`bucket.get('profile-photo')`).

- [ ] **Step 1: Write failing tests** — put a small `File`, then `getPhoto` returns object with matching `httpMetadata.contentType`; non-image rejected; oversized rejected.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement `src/media/photo.ts`.**
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: R2 photo storage"`

---

### Task 10: Views — Layout + global middleware

**Files:** Create `src/views/Layout.tsx`; modify `src/index.ts` (add `jsxRenderer` root layout + global `owner`/`year` middleware); Test `test/layout.test.ts`

**Interfaces:** Produces the root `jsxRenderer` layout accepting `{ title, meta }` (augment `ContextRenderer` per verified snippet). Global middleware sets `c.set('owner', await getProfile(DB) ?? SEED_OWNER)` and `c.set('currentYear', new Date().getFullYear())` on every request. Reproduce `fragments/head.html` + `header.html` + `footer.html` markup exactly (Google Fonts, favicon data-URI, topbar nav, footer columns) — read those three fragments from the source app and port class-for-class. Fix the asset cache-bust: use a constant `BUILD = 'v1'` instead of per-render millis.

- [ ] **Step 1: Write failing test** — `app.request('/healthz')` still 200, and a temporary `GET /__layout` renders `<html>` containing the topbar's signature class (e.g. `class="topbar"`) and `<title>`.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** the root layout + middleware; wire `jsxRenderer`. Port head/header/footer fragments faithfully.
- [ ] **Step 4: Run — expect PASS**, then remove the temporary `/__layout` route.
- [ ] **Step 5: Commit** — `git commit -am "feat: root layout + global middleware"`

---

### Task 11: Views — public pages (Home, BlogList, BlogPost, Login)

**Files:** Create `src/views/pages/{Home,BlogList,BlogPost,Login}.tsx`

**Interfaces:** Each is a component taking typed props (e.g. `Home({ owner, work, workPeriods, projects, latestPosts })`, `BlogPost({ post, owner, bodyHtml })`). **Port each source template class-for-class** from `~/Desktop/Library/java/portfolio/src/main/resources/templates/` (`home.html`, `blog/list.html`, `blog/post.html`, `login.html`). Translate Thymeleaf constructs: `th:each`→`.map()`, `th:if`→`{cond && ...}`, `th:text`→`{value}`, `th:utext="${post.renderedContent}"`→`{raw(bodyHtml)}`, `th:href`→`href={...}`, `${owner.*}`→props. Preserve every class and `data-*` attribute so ported CSS/JS work. `workPeriods` map (id→"MMM yyyy — MMM yyyy/Present") is computed in the route (Task 13) and passed in.

- [ ] **Step 1:** Port `Home.tsx` reproducing all 7 sections (hero, tech marquee, about, work timeline, projects, blog preview, CTA) from `home.html`.
- [ ] **Step 2:** Port `BlogList.tsx`, `BlogPost.tsx` (body via `{raw(bodyHtml)}`), `Login.tsx` (form POST `/login`, `_csrf` hidden field, `?error`/`?logout` handling; standalone — no topbar/footer).
- [ ] **Step 3:** Add a render smoke test (`app.request('/')` after Task 13 wiring returns HTML containing `id="work"` and each seeded project name). Defer running until Task 13.
- [ ] **Step 4: Commit** — `git commit -am "feat: public page views"`

---

### Task 12: Views — admin pages (Dashboard + 4 forms)

**Files:** Create `src/views/admin/{Dashboard,PostForm,WorkForm,ProjectForm,ProfileForm}.tsx`

**Interfaces:** Components taking their entity/list props + a `csrf` token. Port `admin/dashboard.html` + the 4 form templates class-for-class. Every form includes `<input type="hidden" name="_csrf" value={csrf}/>`, posts to the mapped route (Task 14), and lists the exact fields from app map §4. Delete buttons keep `onsubmit="return confirm(...)"`. `ProfileForm` uses `enctype="multipart/form-data"` with the optional `photo` file field, plus the separate `POST /admin/account` credentials form.

- [ ] **Step 1:** Port `Dashboard.tsx` (three lists with View/Edit/Delete + New buttons + toolbar).
- [ ] **Step 2:** Port `PostForm`, `WorkForm`, `ProjectForm`, `ProfileForm` with exact field names.
- [ ] **Step 3: Commit** — `git commit -am "feat: admin page views"`

---

### Task 13: Routes — public, blog, media, health + assembly

**Files:** Create `src/routes/public.ts`, `src/routes/blog.ts`, `src/routes/media.ts`; modify `src/index.ts`; Test `test/public-routes.test.ts`

**Interfaces:** `GET /` (load work+workPeriods+projects+latest(3), render `Home`); `GET /blog` (render `BlogList` from `listPublished`); `GET /blog/:slug` (`getBySlug`; 404 if null or `published===0`; `incrementViews`; `renderPostHtml(content)`→`BlogPost`); `GET /media/profile-photo` (stream R2 object with `writeHttpMetadata` headers + 1yr immutable cache; 404 if absent); keep `GET /healthz`. Compute `workPeriods` here (format `start_date`/`end_date` → "MMM yyyy — MMM yyyy" / "Present").

- [ ] **Step 1: Write failing tests** — after seeding via repos: `/` returns 200 + contains a seeded project name; `/blog/:slug` on unpublished → 404; `/media/profile-photo` with no object → 404.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement route modules; mount in `index.ts`.**
- [ ] **Step 4: Run — expect PASS** (also unblocks Task 11's smoke test).
- [ ] **Step 5: Commit** — `git commit -am "feat: public/blog/media routes"`

---

### Task 14: Routes — auth + admin CRUD + bootstrap

**Files:** Create `src/routes/auth.ts`, `src/routes/admin.ts`, `src/bootstrap.ts`; modify `src/index.ts`; Test `test/admin-routes.test.ts`

**Interfaces:**
- `bootstrap.ts`: `ensureAdmin(db, bootstrapPassword)` — if `countAccounts===0`, `seedAccount('muhammad', await hashPassword(bootstrapPassword))`. Called from a `once`-guarded middleware in `index.ts`.
- `auth.ts`: `POST /login` (verify username+password against `getAccount`; on success `setSession` → redirect `/admin`; else `/login?error`), `POST /logout` (`clearSession` → `/`).
- `admin.ts`: mount under `requireAuth`; issue+verify CSRF on all POSTs. Routes exactly per app map §1: dashboard; posts new/edit/save/delete; work + projects (same shape); `GET/POST /admin/profile` (multipart → `updateProfile` + optional `putPhoto` → `setPhotoPath('/media/profile-photo?v='+Date.now())`); `POST /admin/account` (`updateCredentials`, re-hash if password non-blank). All POST-redirect-GET.

- [ ] **Step 1: Write failing tests** — `/admin/dashboard` unauthenticated → 302 `/login`; login with seeded creds sets cookie; authenticated dashboard → 200; create a post via `POST /admin/posts` (with valid `_csrf`) then it appears in `/admin`.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement auth + admin routes + bootstrap.**
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** — `git commit -am "feat: auth + admin CRUD + bootstrap"`

---

### Task 15: Copy static assets verbatim + seed content

**Files:** Create `public/css/{base,home,blog,admin}.css`, `public/js/reveal.js`, `public/favicon.ico` (if present); Create `seed.sql`

**Interfaces:** Assets copied unchanged from the source app. `seed.sql` ports the non-secret content from `component/Runner.java`: `site_profile` (owner.* defaults), 4 work rows, 6 projects, 1 welcome blog post — idempotent (`INSERT OR IGNORE`). Admin row is NOT seeded here (bootstrap handles it).

- [ ] **Step 1: Copy assets**

```bash
SRC=~/Desktop/Library/java/portfolio/src/main/resources/static
mkdir -p public/css public/js
cp "$SRC"/css/base.css "$SRC"/css/home.css "$SRC"/css/blog.css "$SRC"/css/admin.css public/css/
cp "$SRC"/js/reveal.js public/js/
```

- [ ] **Step 2:** Write `seed.sql` from `Runner.java` literals (work/projects/post + `site_profile`).
- [ ] **Step 3: Apply + verify locally**

```bash
npx wrangler d1 migrations apply kanzen-db --local
npx wrangler d1 execute kanzen-db --file=./seed.sql --local
npm run dev   # visit http://localhost:8787 — confirm home renders styled, blog + admin work
```

- [ ] **Step 4: Commit** — `git commit -am "feat: static assets + content seed"`

---

### Task 16: Full local verification

**Files:** Test `test/integration.test.ts`

- [ ] **Step 1:** Add an end-to-end test: seed via `seed.sql`-equivalent inserts, then walk `/` → `/blog` → `/blog/:slug` (views increment) → login → create/edit/delete a post → logout → `/admin` redirects.
- [ ] **Step 2: Run full suite — expect PASS.** Run: `npm test`
- [ ] **Step 3:** Manual `wrangler dev` pass against the app map: every public section renders identically, every admin action works, photo upload + `/media/profile-photo` round-trips.
- [ ] **Step 4: Commit** — `git commit -am "test: full integration coverage"`

---

### Task 17: Provision production + deploy to workers.dev (no cutover yet)

**Ops task — not TDD. Spring app still serves `kanzen.uz` throughout.**

- [ ] **Step 1:** `npx wrangler d1 create kanzen-db` → paste `database_id` into `wrangler.jsonc`.
- [ ] **Step 2:** `npx wrangler r2 bucket create kanzen-assets`.
- [ ] **Step 3:** `npx wrangler d1 migrations apply kanzen-db --remote` then `npx wrangler d1 execute kanzen-db --file=./seed.sql --remote`.
- [ ] **Step 4:** Set secrets: `npx wrangler secret put SESSION_SECRET` (long random) and `npx wrangler secret put ADMIN_BOOTSTRAP_PASSWORD`.
- [ ] **Step 5:** `npm run deploy` → open the `*.workers.dev` URL, hit `/` once (triggers admin bootstrap), log in, smoke-test every page + admin action + photo upload against remote D1/R2.
- [ ] **Step 6: Commit** — `git commit -am "chore: production D1/R2 provisioned + deployed to workers.dev"`

---

### Task 18: Cutover to kanzen.uz + retire Render

**Ops task.**

- [ ] **Step 1:** In Cloudflare DNS, remove the existing records pointing `kanzen.uz`/`www` at Render (the A `216.24.57.1` + `www` CNAME) so the Custom Domain can attach.
- [ ] **Step 2:** Uncomment the `routes` block in `wrangler.jsonc` (both `kanzen.uz` and `www.kanzen.uz`, `custom_domain: true`) and `npm run deploy` (Cloudflare auto-creates DNS + TLS).
- [ ] **Step 3:** Verify `https://kanzen.uz` and `https://www.kanzen.uz` serve the Worker with a valid cert and **no loading window** — repeat-load to confirm instant responses.
- [ ] **Step 4:** Re-apply your live edits: log in to the new admin, fix the few links you'd changed, and re-upload the profile photo.
- [ ] **Step 5:** Retire Render: delete the `portfolio` Render service and its keep-warm cron Worker.
- [ ] **Step 6: Commit** — `git commit -am "chore: cutover kanzen.uz to Workers; retire Render"`

---

## Self-Review

**Spec coverage:** goal/instant (Tasks 1,17,18) ✓; free tier (Cloudflare, Task 17) ✓; dynamic admin (Tasks 12,14) ✓; identical look (Tasks 10–12 faithful port + Task 15 verbatim assets) ✓; kanzen.uz custom domain (Task 18) ✓. Data model → D1 (Task 2) ✓. All routes (Tasks 13,14) ✓. Auth PBKDF2 + session + CSRF (Tasks 5,6,14) ✓. R2 media (Tasks 9,13) ✓. Markdown + sanitize (Task 4) ✓. Derivations (Task 3) ✓. Testing harness (Task 1) + coverage (Tasks 3–16) ✓. Re-seed from Runner.java, no migration (Task 15) ✓. Retire keep-warm cron (Task 18) ✓.

**Placeholder scan:** `database_id: "PLACEHOLDER"` is intentional (filled in Task 17). View-port tasks reference the exact source templates rather than inlining ~3,300 lines of markup/CSS — the executor reads the named file; this is a deliberate faithful-port instruction, not a vague TODO. No "TBD/handle edge cases" left.

**Type consistency:** `Env`/`Vars`/domain interfaces defined once in `src/types.ts`; repo function names in Tasks 7–9 match their consumers in Tasks 13–14 (`getProfile`, `listWork`, `listPublished`, `getBySlug`, `incrementViews`, `savePost`, `updateProfile`, `setPhotoPath`, `getAccount`, `updateCredentials`). Auth names (`setSession`, `isAuthenticated`, `requireAuth`, `issueCsrf`, `verifyCsrf`, `hashPassword`, `verifyPassword`) consistent across Tasks 5,6,14. Media (`putPhoto`, `getPhoto`) consistent across Tasks 9,13,14.
