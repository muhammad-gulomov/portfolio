# Portfolio Re-Platform: Spring Boot → Cloudflare Workers (edge)

**Date:** 2026-07-11
**Status:** Approved design, pre-implementation
**Source app:** `~/Desktop/Library/java/portfolio` (Spring Boot 3.3.5, Java 17, Thymeleaf, JPA/Postgres)
**Target app:** `~/Desktop/Library/js/portfolio` (this repo)
**Domain:** `kanzen.uz` (DNS already in Cloudflare)

## Problem

The portfolio is served by a heavyweight Spring Boot stack on Render's free tier. Free
web services spin down after ~15 min idle, and this app's cold start is **103 seconds**
(measured from Render logs — dominated by CPU throttling on the free instance, plus
boot-time Supabase round-trips). Visitors hit Render's "application is loading" holding
page. Keep-alive pings and JVM/CDS tuning only shrink the pain; they can't remove it,
because any container-based free service still sleeps.

## Goal & success criteria

Re-platform to Cloudflare's edge so the site:

1. **Opens instantly, always** — Workers run in V8 isolates (~5 ms spin-up), no
   container sleep, no cold-start window. Warm and "cold" are indistinguishable.
2. **Costs nothing** — Cloudflare free tier (Workers 100k req/day, D1 5 GB, R2 10 GB +
   free egress) is far above a portfolio's needs.
3. **Stays fully dynamic** — the live admin panel (login + CRUD for posts/work/projects/
   profile + photo upload) is preserved, editable from anywhere.
4. **Looks identical** — same markup/classes, and the existing CSS + `reveal.js` are
   carried over **verbatim**. Byte-identical visual output.
5. **Serves `kanzen.uz`** from the Worker via a Cloudflare Custom Domain.

## Non-goals (explicitly out of scope)

- **No visual redesign.** Faithful port only; any redesign is a separate later pass.
- **No live-data migration.** Content is re-seeded from `Runner.java`. The owner will
  re-apply a few link edits and re-upload the profile photo via the new admin. No
  Supabase → D1 export.
- **No multi-user auth.** Single admin, as today.

## Architecture (Spring → Cloudflare translation)

| Spring Boot today | Cloudflare edge | Notes |
|---|---|---|
| Embedded Tomcat + `@Controller`s | **Hono** on **Workers** | ~5 ms isolate start, never sleeps |
| Thymeleaf templates + fragments | **Hono JSX** (`jsxRenderer`) | same HTML/classes → CSS/JS unchanged |
| `static/*` (CSS, `reveal.js`, favicon) | **Workers static assets** (`public/`) | copied **verbatim** |
| JPA/Hibernate + Supabase Postgres | **D1** (edge SQLite) | hand-authored migrations |
| `ProfilePhoto` bytea in Postgres | **R2** object storage | free egress, streamed |
| Spring Security form-login + `JSESSIONID` | **signed HTTP-only cookie** session | Hono cookie helpers + `SESSION_SECRET` |
| BCrypt hash | **PBKDF2-SHA256** (Web Crypto) | BCrypt native lib absent on Workers |
| CSRF auto-tokens | signed per-session **CSRF token** + Origin check | replicated deliberately |
| CommonMark (tables + autolink) | `markdown-it` (tables + autolink) + sanitize | rendered at read-time |
| `@ControllerAdvice` global `owner`/`year` | Hono middleware injecting the same | one query per request |
| `/healthz` (Render check + keep-warm cron) | keep `/healthz`, **retire the cron** | no sleep ⇒ no keep-warm |

## Data model → D1 schema

Mirrors the JPA entities exactly. Singletons (`site_profile`, `admin_account`) keep the
fixed `id = 1` convention. Dates stored as ISO **TEXT** (SQLite has no date type);
booleans as `INTEGER` 0/1.

```sql
CREATE TABLE site_profile (            -- singleton id=1
  id INTEGER PRIMARY KEY, name TEXT, handle TEXT, tagline TEXT, location TEXT,
  email TEXT, github TEXT, linkedin TEXT, telegram TEXT, instagram TEXT,
  photo_path TEXT
);
CREATE TABLE work_experiences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL, role TEXT NOT NULL, location TEXT,
  start_date TEXT NOT NULL, end_date TEXT, summary TEXT, tech TEXT,
  url TEXT, project_links TEXT, display_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, tagline TEXT, description TEXT, tech TEXT,
  url TEXT, github_url TEXT, image_url TEXT, display_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, excerpt TEXT,
  content TEXT NOT NULL, published_at TEXT NOT NULL,
  reading_minutes INTEGER NOT NULL, views INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE admin_account (           -- singleton id=1
  id INTEGER PRIMARY KEY, username TEXT NOT NULL, password_hash TEXT NOT NULL
);
```

**Seed migration** ports `Runner.java`: `site_profile` from `owner.*` defaults, 4 work
entries, 6 projects, 1 welcome blog post, and `admin_account` (PBKDF2 hash generated
locally, not committed).

**Derived-on-save logic** (ports 1:1 from `MarkdownService`/`BlogServiceImpl`):
slug-ification (NFD normalize, strip non-`[\w-]`, lowercase, spaces→`-`, fallback
`"post"`), auto-excerpt (strip md, collapse ws, 220 chars + "…"), `reading_minutes =
ceil(words / 220)` min 1, and `views = views + 1` increment on post view.

## Routes (ported 1:1)

Public: `GET /`, `GET /blog`, `GET /blog/:slug` (404 if unpublished; increments views),
`GET /login`, `GET /media/profile-photo` (from R2), `GET /healthz` (SELECT 1).

Auth: `POST /login` (verify → set session → `/admin`), `POST /logout` (clear → `/`).

Admin (all behind session guard on `/admin/*`): `GET /admin` dashboard; posts
`GET /admin/posts/new`, `GET /admin/posts/:id/edit`, `POST /admin/posts`,
`POST /admin/posts/:id/delete`; work + projects mirror the same five; profile
`GET /admin/profile`, `POST /admin/profile` (multipart, optional `photo`),
`POST /admin/account` (change username/password). All use POST-redirect-GET. Form fields
are exactly as enumerated in the app map.

## Auth design

Single admin in `admin_account` (kept in D1 so credentials remain runtime-editable via
`POST /admin/account`). Login derives PBKDF2-SHA256 (100k iterations, per-user random
salt, stored as `salt:hash`) and compares with `crypto.subtle.timingSafeEqual`. On
success, set a **signed, HTTP-only, SameSite=Lax** session cookie (8 h). `/admin/*`
middleware rejects a missing/tampered cookie → redirect `/login`. CSRF: signed
per-session token in a hidden field on every admin form, verified on POST, plus an Origin
header check as defense-in-depth. Secrets held as Workers secrets: `SESSION_SECRET`
(cookie signing) and the initial admin hash — generated locally, never in git.

## Media (R2)

Profile photo lives in R2 at a fixed key with its content-type in `httpMetadata`.
`POST /admin/profile` validates `image/*` and ≤5 MB, `put`s to R2, and stores
`site_profile.photo_path = "/media/profile-photo?v=<Date.now()>"` for cache-busting.
`GET /media/profile-photo` streams the R2 object with `Cache-Control: public,
max-age=31536000, immutable`. 404 if absent.

## Templating & assets

Hono JSX components reproduce the Thymeleaf output structure exactly: a `Layout` plus
`Head` / `Header` / `Footer` fragment-equivalents, and pages `home`, `blog/list`,
`blog/post`, `login`, `admin/dashboard` + 4 admin forms. Every class name and
`data-*` attribute is preserved so `base/home/blog/admin.css` and `reveal.js` — **copied
into `public/` verbatim** — behave identically. Markdown output injected as raw HTML
(sanitized). Global `owner` (from `site_profile`) and `currentYear` injected via
middleware. Fix the existing asset cache-bust bug by using a fixed build version instead
of per-render millis.

## Project structure

```
src/
  index.ts            app assembly + global owner/year middleware
  auth/               pbkdf2, session cookie, csrf, guard middleware
  db/                 one repo module per table (profile, work, project, blog, account)
  content/            markdown render + slug/excerpt/reading-time derivations
  media/              R2 put/get for the profile photo
  views/              JSX: Layout + Head/Header/Footer + each page & admin form
  routes/             handlers grouped: public, blog, admin, auth, media
migrations/           D1 schema + seed (ported from Runner.java)
public/               base/home/blog/admin.css, reveal.js, favicon  ← verbatim
wrangler.jsonc        D1 + R2 + assets + custom-domain bindings
```

## Testing

Focused tests on parts that can silently break: PBKDF2 hash/verify round-trip, markdown
rendering (tables + autolink + sanitize), and the slug/excerpt/reading-time derivations;
plus a couple of route integration tests (`@cloudflare/vitest-pool-workers` against local
D1) covering the auth guard and a public page.

## Build & cutover plan (Spring stays live throughout)

1. Scaffold the Hono/Workers TS project in this repo; Spring app stays untouched and
   keeps serving `kanzen.uz`.
2. D1 migrations + seed (from `Runner.java`).
3. Port templates → JSX (preserve classes), copy CSS/JS verbatim, wire routes + auth + R2.
4. `wrangler dev` locally (local D1/R2) — verify every page and every admin action.
5. Provision prod D1 + R2, apply migrations `--remote`, set secrets, `wrangler deploy`
   to `*.workers.dev`; smoke-test there.
6. **Cutover:** attach `kanzen.uz` as a Workers Custom Domain (Cloudflare repoints DNS),
   verify, then retire the Render service + keep-warm cron.

## Risks / open items

- **Markdown sanitization** — the Spring app did none (`th:utext` on trusted admin
  content). We add a sanitizer deliberately; verify it doesn't strip legitimate markup.
- **CSRF** — must be present on all admin POSTs before cutover.
- **10 ms CPU budget** — PBKDF2 at 100k iterations must stay under it for login; drop
  toward 50k if needed (I/O waits don't count against CPU time).
- **Local vs remote D1/R2 are separate stores** — migrations/seed must be applied
  `--remote` explicitly before cutover.
