# Remove Russian / Retire Multilanguage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make both portfolio codebases English-only — no translation tables, no locale middleware, no language picker, no Russian columns.

**Architecture:** Two independent codebases, done in order. kanzen (Hono + D1, not yet deployed, 170 tests) is peeled back in four green-to-green steps: UI first, then SEO, then the `lang` parameter, then the string table itself. The Spring app (live on Render + Supabase) follows expand/contract — templates, then Java, then a hand-run column drop after the deploy is verified.

**Tech Stack:** TypeScript · Hono JSX · Cloudflare Workers/D1 · Vitest (`@cloudflare/vitest-pool-workers`) — and Java 21 · Spring Boot 3.3.5 · Thymeleaf · Postgres (Supabase).

**Spec:** `docs/superpowers/specs/2026-09-05-remove-russian-localization-design.md`

## Global Constraints

- **Repo paths.** kanzen = `~/Desktop/Library/java/kanzen`. Spring = `~/Desktop/Library/java/portfolio`. Both are on branch `feature/remove-russian-localization`.
- **English copy is moved verbatim.** Never reword while inlining. If a string looks wrong, leave it and raise it.
- **kanzen baseline is 22 files / 170 tests green.** Run `npm test` before and after every task. A task is not done on a red suite.
- **Every kanzen task must end compiling.** Never leave a component accepting a prop its caller no longer passes, or vice versa — that is a TS error, not a warning.
- **Spring: templates before Java.** Thymeleaf resolves at runtime, so a template referencing a deleted bean compiles fine and 500s in the browser.
- **Spring: code before schema.** `spring.jpa.hibernate.ddl-auto=update` never drops columns. Task 7 is gated on Task 6 being deployed and verified.
- **Two "Russian" strings are CONTENT, not machinery, and are NOT touched by this plan** (see *Deliberately out of scope* below).

## Deliberately out of scope

These name Russian but are biographical facts about Muhammad, not multilanguage support. Removing them would make the site state something untrue:

- `src/views/pages/Home.tsx:88` — `knowsLanguage: ['en', 'ru', 'uz']` in the schema.org `Person` JSON-LD.
- Spring `messages.properties` — `about.languages.value=Uzbek · Russian · English`. Task 5 inlines this string **verbatim, Russian included**.

If Muhammad wants these gone too, that is a separate content change.

---

## Task 1: Delete the language picker and the Cyrillic font (kanzen)

Self-contained: removes UI and an asset. The `lang` machinery still exists and still works after this task.

**Files:**
- Modify: `src/views/Layout.tsx:164-172, 197-226`
- Modify: `public/css/base.css:1-13, 26-32, 51-60, 274-345, 422`
- Modify: `public/js/site.js:67-115`
- Delete: `public/fonts/plex-cyrillic.woff2`
- Test: `test/pages.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. No exported signature changes.

- [ ] **Step 1: Write the failing test**

Append to `test/pages.test.tsx`, inside the existing `describe('Layout stylesheet inlining')` block's file (top level is fine — add a new describe at the end of the file):

```tsx
describe('no language affordances remain', () => {
  beforeEach(() => clearCssCache())

  it('renders no language picker in the topbar', async () => {
    const app = new Hono<{ Variables: Vars }>()
    app.use('*', LayoutMiddleware)
    app.get('/t', (c) => {
      c.set('owner', owner)
      c.set('lang', lang)
      c.set('t', t)
      return c.render(<p>x</p>, { title: 'T', css: 'home' })
    })
    const body = await (await app.request('/t')).text()
    expect(body).not.toContain('data-lang-trigger')
    expect(body).not.toContain('data-lang-menu')
    expect(body).not.toContain('?lang=')
  })

  it('never preloads the Cyrillic font', async () => {
    const app = new Hono<{ Variables: Vars }>()
    app.use('*', LayoutMiddleware)
    app.get('/t', (c) => {
      c.set('owner', owner)
      c.set('lang', lang)
      c.set('t', t)
      return c.render(<p>x</p>, { title: 'T' })
    })
    const body = await (await app.request('/t')).text()
    expect(body).not.toContain('plex-cyrillic')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- pages`
Expected: FAIL — the first test finds `data-lang-trigger` in the body.

- [ ] **Step 3: Remove the picker markup**

In `src/views/Layout.tsx`, delete the whole `<div class="lang">…</div>` block (lines 197-226), leaving `<div class="utility">` containing only the theme-toggle button.

Also delete the conditional Cyrillic preload (lines 164-172):

```tsx
          {lang === 'ru' && (
            <link
              rel="preload"
              href="/fonts/plex-cyrillic.woff2"
              as="font"
              type="font/woff2"
              crossorigin=""
            />
          )}
```

- [ ] **Step 4: Remove the picker CSS**

In `public/css/base.css`, delete lines 274-343 — the `/* ── Language picker ── */` comment block through `.lang-menu .flag { … }` and its trailing blank line.

Rewrite the comment now above `.theme-toggle` (was 344-345), which still refers to the picker:

```css
/* A round chip in the topbar's utility corner, sized to sit comfortably
   against the brand on the opposite edge. */
```

In the `@media (max-width: 40rem)` block near line 422, drop the `.lang-trigger,` selector so only `.theme-toggle` remains:

```css
    .theme-toggle { height: 2.25rem; width: 2.25rem; }
```

- [ ] **Step 5: Remove the Cyrillic face**

In `public/css/base.css`, delete the `@font-face` for `'IBM Plex Sans'` (lines 26-32) and drop it from the stack:

```css
    --face: 'Figtree', ui-sans-serif, system-ui,
            -apple-system, 'Segoe UI', Roboto, sans-serif;
```

Replace the file's opening comment block (lines 1-13) with:

```css
/* =========================================================
   Figtree, self-hosted

   One face, one file: no third-party origin and no CSS round-trip
   standing between the browser and the font. The unicode-range is
   Figtree's Latin subset — the site ships no other script.
   ========================================================= */
```

And replace the `--face` comment (was lines 51-59) with:

```css
    /* ── Type ─────────────────────────────────────────────
       Figtree throughout, with a system stack behind it for
       the swap window. */
```

- [ ] **Step 6: Delete the dead script and the font file**

In `public/js/site.js`, delete lines 67-115 — from the `// ── Language menu ──` banner through the closing `})` of the `menu.addEventListener('keydown', …)` handler. **Keep line 116, `})()`,** which closes the IIFE. The `if (!trigger || !menu) return` guard on line 70 goes with the block; leaving it would early-return past nothing but still ship.

```bash
rm public/fonts/plex-cyrillic.woff2
```

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS — 172 tests (170 baseline + 2 new).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Remove the language picker and the Cyrillic font"
```

---

## Task 2: Collapse the SEO surface (kanzen)

**Files:**
- Modify: `src/views/Layout.tsx:125-145`
- Modify: `src/routes/public.tsx:33-53`
- Test: `test/pages.test.tsx`, `test/public-routes.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Write the failing tests**

Add to the `describe('no language affordances remain')` block in `test/pages.test.tsx`:

```tsx
  it('emits one canonical and no hreflang alternates', async () => {
    const app = new Hono<{ Variables: Vars }>()
    app.use('*', LayoutMiddleware)
    app.get('/t', (c) => {
      c.set('owner', owner)
      c.set('lang', lang)
      c.set('t', t)
      return c.render(<p>x</p>, { title: 'T' })
    })
    const body = await (await app.request('/t')).text()
    expect(body).not.toContain('hreflang')
    expect(body).not.toContain('og:locale:alternate')
    expect(body).toContain('<link rel="canonical" href="https://kanzen.uz/"')
    expect(body).toContain('content="en_US"')
  })
```

Add to `test/public-routes.test.ts`, in the same describe that covers the other public routes:

```ts
  it('sitemap lists one URL with no language alternates', async () => {
    const res = await SELF.fetch('https://x/sitemap.xml')
    expect(res.status).toBe(200)
    const xml = await res.text()
    expect(xml).not.toContain('xhtml')
    expect(xml).not.toContain('hreflang')
    expect(xml).toContain('<loc>https://kanzen.uz/</loc>')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — both new tests find `hreflang`.

- [ ] **Step 3: Fix the head**

In `src/views/Layout.tsx`, replace the canonical/alternate block (lines 125-133) with:

```tsx
          {/* kanzen.uz and www.kanzen.uz are both custom domains on this
              Worker, and query strings make more addresses still. Canonical
              names the one that counts. The Worker also 301s www -> apex,
              which is the stronger fix; this covers the rest. */}
          <link rel="canonical" href={`${SITE}/`} />
```

Replace the two `og:` locale lines (144-145) with a single fixed one, and make `og:url` constant (139):

```tsx
          <meta property="og:url" content={`${SITE}/`} />
```
```tsx
          <meta property="og:locale" content="en_US" />
```

- [ ] **Step 4: Fix the sitemap**

In `src/routes/public.tsx`, replace the comment and the XML (lines 33-53) with:

```tsx
// One page, one language. Small, but it is the canonical way to tell a
// crawler which URLs exist.
publicRoutes.get('/sitemap.xml', (c) => {
  const site = 'https://kanzen.uz'
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site}/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`
  return c.body(xml, 200, {
    'content-type': 'application/xml; charset=UTF-8',
    'cache-control': 'public, max-age=3600',
  })
})
```

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — 174 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Drop hreflang, locale alternates and the sitemap's language links"
```

---

## Task 3: Drop the `lang` parameter from the render path (kanzen)

The string table survives this task; only the language *selection* dies. `t` stays, permanently bound to English.

**Files:**
- Modify: `src/i18n/locale.ts`, `src/types.ts:37`
- Modify: `src/views/pages/BlogList.tsx:4,8-15,17-23,53`, `src/views/pages/BlogPost.tsx:4,8-12,14-22,33`, `src/views/pages/Home.tsx:8,16,30-35`, `src/views/pages/Login.tsx:4,19,24,32`, `src/views/Layout.tsx:4,100,116`
- Modify: `src/routes/public.tsx:3,7-28,61-76`, `src/routes/blog.tsx:13,15,37`, `src/routes/auth.tsx:20`
- Test: `test/public-routes.test.ts:144-146`, `test/pages.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `fmtPeriod(startDate: string, endDate: string | null, presentLabel?: string): string` — the `lang` parameter is gone; `presentLabel` stays and keeps defaulting to `'Present'`.

- [ ] **Step 1: Delete the Russian-months test**

In `test/public-routes.test.ts`, delete this case entirely (lines 144-146 plus its `it(...)` wrapper):

```ts
  it('uses Russian short months and present label when lang=ru', () => {
    expect(fmtPeriod('2022-01-15', '2024-03-01', 'н.в.', 'ru')).toBe('янв 2022 — мар 2024')
    expect(fmtPeriod('2023-06-01', null, 'н.в.', 'ru')).toBe('июн 2023 — н.в.')
  })
```

- [ ] **Step 2: Run to confirm the remaining fmtPeriod tests still pass**

Run: `npm test -- public-routes`
Expected: PASS — the two English `fmtPeriod` cases are untouched.

- [ ] **Step 3: Simplify the date formatters**

`src/routes/public.tsx` — delete `MONTHS_RU`, drop the `Lang` import, and take `lang` out of both functions:

```tsx
function fmtPeriodDate(iso: string): string {
  const parts = iso.split('-')
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1] ?? '1', 10) - 1
  return `${MONTHS_EN[month]} ${year}`
}

export function fmtPeriod(
  startDate: string,
  endDate: string | null,
  presentLabel = 'Present',
): string {
  const start = fmtPeriodDate(startDate)
  const end = endDate ? fmtPeriodDate(endDate) : presentLabel
  return `${start} — ${end}`
}
```

`src/views/pages/BlogList.tsx`:

```tsx
// Format ISO date → "Jan 01 · 2026" (matches Thymeleaf `MMM dd · yyyy`)
function fmtListDate(iso: string): string {
  const d = new Date(iso)
  const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
  const day = String(d.getUTCDate()).padStart(2, '0')
  const year = d.getUTCFullYear()
  return `${month} ${day} · ${year}`
}
```

`src/views/pages/BlogPost.tsx`:

```tsx
// Format ISO date → "January 1, 2026" (matches Thymeleaf `MMMM d, yyyy`)
function fmtPostDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}
```

- [ ] **Step 4: Remove `lang` from every props interface and call site**

Delete the `type Lang = 'en' | 'ru'` line from `Home.tsx:8`, `BlogList.tsx:4`, `BlogPost.tsx:4`, `Login.tsx:4`. Delete `lang: Lang` from `HomeProps`, `BlogListProps`, `BlogPostProps`, `LoginProps`, and remove `lang` from each destructure and from the two date calls (`BlogList.tsx:53` → `fmtListDate(post.publishedAt)`, `BlogPost.tsx:33` → `fmtPostDate(post.publishedAt)`).

`Login.tsx:32` — the `<html>` tag becomes literal:

```tsx
    <html lang="en">
```

`Layout.tsx` — drop the `Lang` import (line 4), delete the `const lang = …` line (100), and make the tag literal (116):

```tsx
      <html lang="en">
```

Routes: `public.tsx` drops `const lang = c.get('lang')`, passes `fmtPeriod(w.startDate, w.endDate, present)` and no `lang` prop; `blog.tsx` drops `const lang = c.get('lang')` and both `lang={…}` props; `auth.tsx` drops `lang={c.get('lang')}`.

- [ ] **Step 5: Stop setting `lang`**

`src/types.ts` — delete `lang: 'en' | 'ru'` from `Vars`.

`src/i18n/locale.ts` — the middleware now only binds `t` to English. Replace the file with:

```ts
import type { Context, Next } from 'hono'
import { t as translate } from './messages'

declare module 'hono' {
  interface ContextVariableMap {
    t: (key: string, ...args: (string | number)[]) => string
  }
}

export async function localeMiddleware(c: Context, next: Next) {
  c.set('t', (key: string, ...args: (string | number)[]) => translate('en', key, ...args))
  await next()
}
```

- [ ] **Step 6: Update the test harness**

In `test/pages.test.tsx`, delete `const lang = 'en' as const`, every `c.set('lang', lang)`, and every `lang={lang}` prop.

- [ ] **Step 7: Fix the stale comment**

`src/views/pages/Home.tsx:30-35` still cites the Russian label. Replace with:

```tsx
/**
 * fmtPeriod joins its two halves with " — ". Splitting on that lets the
 * terminal word ("Present") carry the accent on its own while fmtPeriod
 * keeps its single-string contract, which the route and its tests both
 * depend on.
 */
```

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: PASS — 173 tests (174 minus the deleted Russian-months case).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Remove the lang parameter from views, routes and context"
```

---

## Task 4: Inline the chrome strings and delete `src/i18n` (kanzen)

**Files:**
- Delete: `src/i18n/locale.ts`, `src/i18n/messages.ts`
- Modify: `src/index.tsx:12,44-47`, `src/types.ts`, all five views, `src/routes/blog.tsx:12,16`, `src/routes/public.tsx:62-64`, `src/routes/auth.tsx:19`
- Test: `test/pages.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `Vars` becomes `{ owner: SiteProfile; csrf?: string }`.

- [ ] **Step 1: Substitute the 36 strings**

Replace every `t('key')` call with the English literal below. Where the value contains markup, keep the surrounding `raw(…)`.

| Key | English value | Call site |
|---|---|---|
| `nav.skip` | `Skip to content` | `Layout.tsx` |
| `nav.theme` | `Switch color theme` | `Layout.tsx` |
| `nav.lang` | *(unused after Task 1 — drop)* | — |
| `meta.fallback` | `Lead engineer in Tashkent — backend, web, and mobile` | `Layout.tsx` ×2 |
| `page.home` | `Portfolio` | `Layout.tsx` |
| `page.blog` | `Blog` | `routes/blog.tsx:16` |
| `page.login` | `Sign in` | `Login.tsx:38` |
| `intro.p1` | *(see below — `raw`)* | `Home.tsx:134` |
| `intro.p2` | *(see below — `raw`)* | `Home.tsx:135` |
| `about.title` | `About me` | `Home.tsx:130` |
| `work.title` | `Work history` | `Home.tsx:155` |
| `work.present` | `Present` | `routes/public.tsx:63` |
| `work.empty` | `Nothing here yet.` | `Home.tsx:159` |
| `cta.telegram` | `Telegram` | `Home.tsx:108` |
| `cta.email` | `Email` | `Home.tsx:109` |
| `blog.minread` | `{0} min read` | `BlogPost.tsx:35` |
| `blog.min` | `{0} min` | `BlogList.tsx:58` |
| `blog.masthead.title` | `The Blog` | `BlogList.tsx:29` |
| `blog.masthead.notes` | `Field notes` | `BlogList.tsx:30` |
| `blog.masthead.freq` | `Published irregularly` | `BlogList.tsx:31` |
| `blog.eyebrow` | `The blog` | `BlogList.tsx:34` |
| `blog.title` | `Essays on <em>craft</em>, code, and the quiet in between.` | `BlogList.tsx:35` (`raw`) |
| `blog.sub` | `Short field notes from building things.` | `BlogList.tsx:36` |
| `blog.empty` | `No posts published yet.` | `BlogList.tsx:65` |
| `post.back` | `← Back to blog` | `BlogPost.tsx:29` |
| `post.all` | `← All posts` | `BlogPost.tsx:53` |
| `post.views` | `Viewed <b>{0}</b> times` | `BlogPost.tsx:51` (`raw`) |
| `login.private` | `Private` | `Login.tsx:53` |
| `login.title` | `Welcome <em>back</em>.` | `Login.tsx:54` (`raw`) |
| `login.sub` | `Sign in to manage your portfolio.` | `Login.tsx:55` |
| `login.username` | `Username` | `Login.tsx:70` |
| `login.password` | `Password` | `Login.tsx:74` |
| `login.submit` | `Sign in` | `Login.tsx:79` |
| `login.error` | `Incorrect username or password.` | `Login.tsx:59` |
| `login.signedout` | `You've been signed out.` | `Login.tsx:64` |
| `login.back` | `← Back to site` | `Login.tsx:83` |

The two `raw()` strings in `Home.tsx` are long; copy them exactly:

```tsx
            <p class="lede">I'm a lead engineer who builds products end to end — backend, web, and mobile.</p>
            <p class="lede">{raw('Currently building at <a href="https://yodla-app.uz" target="_blank" rel="noopener">Yodla</a> (~500k users) and <a href="https://avtodars-avtomaktab.uz" target="_blank" rel="noopener">Avtodars</a>. On the side, I\'m building <a href="https://birga-app.uz" target="_blank" rel="noopener">Birga</a>.')}</p>
```

`intro.p1` carries no markup, so it drops its `raw()` and becomes plain text as shown. Update the comment above it (`Home.tsx:131-133`):

```tsx
            {/* raw() because the intro names the products it links to, and a
                link inside a sentence cannot be expressed as plain text. This
                is an author-written constant, never CMS content. */}
```

The two interpolated strings become template literals:

```tsx
              <span>{`${post.readingMinutes} min read`}</span>
```
```tsx
                    <div class="read-time">{`${post.readingMinutes} min`}</div>
```
```tsx
              {raw(`Viewed <b>${post.views}</b> times`)}
```

`Layout.tsx` — the title/description block loses `t`:

```tsx
    const pageTitle = !title
      ? 'Portfolio'
      : owner?.name && title !== owner.name
        ? `${title} — ${owner.name}`
        : title

    const FALLBACK = 'Lead engineer in Tashkent — backend, web, and mobile'
    const description = meta ?? (
      owner?.name ? `${owner.name} — ${FALLBACK}` : FALLBACK
    )
```

and the `og:image:alt` line becomes:

```tsx
          <meta property="og:image:alt" content={`${owner?.name ?? 'Muhammad Gulomov'} — ${FALLBACK}`} />
```

- [ ] **Step 2: Remove `t` from every signature**

Delete `type TFn = …` and the `t: TFn` field from `HomeProps`, `BlogListProps`, `BlogPostProps`, `LoginProps`, and from every destructure. Delete `const t = c.get('t')` and every `t={…}` prop in `routes/public.tsx`, `routes/blog.tsx`, `routes/auth.tsx`. In `Layout.tsx` delete `const t = c.get('t') as …`.

`routes/blog.tsx:16` — the render options lose their `t` call:

```tsx
    { title: 'Blog', css: 'blog' },
```

- [ ] **Step 3: Unwire and delete the module**

`src/index.tsx` — delete the `import { localeMiddleware } from './i18n/locale'` line and the whole `app.use('*', …)` block that calls it (lines 44-47).

`src/types.ts` — `Vars` becomes:

```ts
export type Vars = {
  owner: SiteProfile
  csrf?: string
}
```

```bash
rm -r src/i18n
```

- [ ] **Step 4: Update the tests**

In `test/pages.test.tsx`: delete the `import { t as translate } from '../src/i18n/messages'` line, the `const t = …` line, every `c.set('t', t)`, and every `t={t}` prop.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — 173 tests.

- [ ] **Step 6: Prove nothing survived**

```bash
grep -rn "i18n\|hreflang\|data-lang\|lang=" src public | grep -v 'lang="en"'
grep -rlP '[\x{0400}-\x{04FF}]' src public test
```
Expected: the first prints nothing; the second prints nothing.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Inline the English chrome copy and delete the i18n module"
```

---

## Task 5: Inline the Thymeleaf messages and unwrap the content picker (Spring)

Templates first: after this the app still runs, and the Java in Task 6 is unreferenced by any template.

**Files:**
- Modify: `src/main/resources/templates/home.html`, `login.html`, `blog/list.html`, `blog/post.html`, `fragments/header.html`, `fragments/footer.html`, `fragments/head.html`
- Modify: `src/main/resources/templates/admin/profile-form.html:58-59`, `work-form.html:74-84`, `project-form.html:40-45`, `post-form.html:46-55`
- Modify: `src/main/resources/static/css/base.css` (`.lang-switch` rules)

**Interfaces:**
- Consumes: nothing.
- Produces: templates reference only `${…}` expressions on English getters.

- [ ] **Step 1: Inline all 94 `#{key}` occurrences**

For each `#{key}`, substitute the value from `src/main/resources/messages.properties`
— **that file is the source of truth for this step and is still present; Task 6
deletes it.** All 87 keys are there; do not invent copy for a key you cannot find. `th:text="#{nav.skip}"` becomes plain body text; the tag's existing placeholder text is replaced, and the `th:text` attribute is removed:

```html
<a class="skip-link" href="#main">Skip to content</a>
```

For attribute forms, drop the Thymeleaf attribute and write the literal:

```html
<button class="theme-toggle compact" type="button" aria-label="Switch color theme" data-theme-toggle>
```

`\uXXXX` escapes in the properties file are literal characters in HTML: `—` is `—`, `·` is `·`, `←` is `←`, `↑` is `↑`. Values containing tags (`about.title`, `cta.line2`, `foot.colophon.text`, `blog.title`, `login.title`, `hero.currently.text`, `bio.p1`, `bio.p2`, `about.focus.value`, the `work.title`/`projects.title`/`blogp.title` headings) become literal markup — write the HTML straight into the template rather than
reaching for `th:utext`, which would only re-introduce an indirection.

**`about.languages.value` is inlined verbatim as `Uzbek · Russian · English`.** It states which languages Muhammad speaks; see *Deliberately out of scope*.

`fragments/head.html:22` — replace `#messages.msg('meta.fallback')` with the literal:

```html
          th:content="${owner != null and !#strings.isEmpty(owner.name) ? owner.name + ' — ' + owner.tagline : 'Software engineer portfolio'}">
```

- [ ] **Step 2: Unwrap all 15 `@i18n.pick` occurrences**

```html
<!-- home.html:38 -->
<p class="hero-lede" th:text="${owner.tagline}">
<!-- home.html:205, 207, 213 -->
<span ... th:text="${w.location}">Remote</span>
<h3 class="t-role" th:text="${w.role}">Senior Engineer</h3>
<p ... th:text="${w.summary}">Did things.</p>
<!-- home.html:261 — the Elvis fallback on the English side stays -->
<p class="pc-tagline" th:text="${p.tagline ?: p.description}">An old idea, reimagined.</p>
<!-- home.html:309, 310 -->
<h3 class="pr-title" th:text="${post.title}">Title</h3>
<p class="pr-excerpt" th:text="${post.excerpt}">Excerpt</p>
<!-- blog/list.html:39, 40 -->
<h2 th:text="${post.title}">Post title</h2>
<p class="excerpt" th:text="${post.excerpt}">An excerpt of the piece.</p>
<!-- blog/post.html:3 -->
<head th:replace="~{fragments/head :: head(${post.title}, 'blog')}"></head>
<!-- blog/post.html:24 -->
<h1 class="reveal" data-split style="--d:.1s" th:text="${post.title}">Post title</h1>
<!-- blog/post.html:26-27 — two calls collapse into one guard -->
<p ... th:if="${post.excerpt != null and !#strings.isEmpty(post.excerpt)}"
   th:text="${post.excerpt}">
```

- [ ] **Step 3: Delete the flag switcher**

In `fragments/header.html`, delete the entire `<span class="lang-switch">…</span>` block (lines 19-23). In `src/main/resources/static/css/base.css`, delete the `.lang-switch` rules.

- [ ] **Step 4: Pin the document language**

In `home.html:2`, `login.html:2`, `blog/list.html:2`, `blog/post.html:2`, replace:

```html
<html lang="en" th:lang="${#locale.language}" xmlns:th="http://www.thymeleaf.org">
```

with:

```html
<html lang="en" xmlns:th="http://www.thymeleaf.org">
```

- [ ] **Step 5: Remove the RU admin inputs**

Delete these field groups entirely — each is a `<div class="field">` (or equivalent) wrapping a label plus input:

- `admin/profile-form.html:58-59` — Tagline (RU)
- `admin/work-form.html:74-84` — Role (RU), Location (RU), Summary (RU)
- `admin/project-form.html:40-45` — Tagline (RU), Description (RU)
- `admin/post-form.html:46-55` — Title (RU), Excerpt (RU), Body (RU)

- [ ] **Step 6: Verify no template references remain**

```bash
grep -rn "#{\|@i18n\|#locale\|lang-switch\|Ru}" src/main/resources/templates
```
Expected: no output.

- [ ] **Step 7: Build and check by hand**

Run: `./mvnw -q package && ./mvnw spring-boot:run`
Then open `/`, `/blog`, one post, and `/login`. Expected: every string reads as English prose. **A missed key renders as `??key_en??`** — search the page source for `??` before calling this done.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Inline English copy into the templates and drop the locale picker"
```

---

## Task 6: Remove the locale infrastructure and the Russian columns from Java (Spring)

**Files:**
- Delete: `src/main/java/uz/muhammadtrying/portfolio/config/LocaleConfig.java`
- Delete: `src/main/java/uz/muhammadtrying/portfolio/component/LocalizedContent.java`
- Delete: `src/main/java/uz/muhammadtrying/portfolio/component/RussianContentBackfill.java`
- Delete: `src/main/resources/messages.properties`, `src/main/resources/messages_ru.properties`
- Modify: `entity/SiteProfile.java:34`, `entity/WorkExperience.java:28,34,45`, `entity/Project.java:26,32`, `entity/BlogPost.java:28,34,40`
- Modify: `controller/AdminController.java:149`, `service/BlogServiceImpl.java:70-76`, `service/WorkServiceImpl.java:4,5,12,20,44-52`

**Interfaces:**
- Consumes: templates from Task 5 no longer call `@i18n.pick` or any `*Ru` getter.
- Produces: `WorkService.periodLabel(WorkExperience w)` keeps its signature and now always formats in English.

- [ ] **Step 1: Delete the three components and both properties files**

```bash
rm src/main/java/uz/muhammadtrying/portfolio/config/LocaleConfig.java
rm src/main/java/uz/muhammadtrying/portfolio/component/LocalizedContent.java
rm src/main/java/uz/muhammadtrying/portfolio/component/RussianContentBackfill.java
rm src/main/resources/messages.properties src/main/resources/messages_ru.properties
```

- [ ] **Step 2: Remove the nine entity fields**

Delete `private String taglineRu;` from `SiteProfile`; `roleRu`, `locationRu`, `summaryRu` from `WorkExperience`; `taglineRu`, `descriptionRu` from `Project`; `titleRu`, `excerptRu`, `contentRu` from `BlogPost` — together with any `@Column` annotation attached to each.

- [ ] **Step 3: Fix the three consumers**

`AdminController.java:149` — delete the line:

```java
        current.setTaglineRu(form.getTaglineRu());
```

`BlogServiceImpl.java` — `withRendered` collapses:

```java
    private BlogPost withRendered(BlogPost p) {
        p.setRenderedContent(markdown.render(p.getContent()));
        return p;
    }
```

`WorkServiceImpl.java` — pin English and drop the now-unused `MessageSource`:

```java
    @Override
    public String periodLabel(WorkExperience w) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);
        String start = w.getStartDate() != null ? fmt.format(w.getStartDate()) : "";
        String end = w.getEndDate() != null ? fmt.format(w.getEndDate()) : "Present";
        return start + " — " + end;
    }
```

Then delete the `messageSource` field (line 20) and the `MessageSource` / `LocaleContextHolder` imports (lines 4-5). **Keep `import java.util.Locale;`** — `Locale.ENGLISH` still uses it.

- [ ] **Step 4: Compile**

Run: `./mvnw -q package`
Expected: BUILD SUCCESS. A failure here names any consumer of a removed getter that this plan missed.

- [ ] **Step 5: Prove nothing survived**

```bash
grep -rn "Ru\b\|Russian\|Locale\|MessageSource\|#{" src/main
```
Expected: only `Locale.ENGLISH` and `import java.util.Locale;` in `WorkServiceImpl.java`.

- [ ] **Step 6: Run and check by hand**

Run: `./mvnw spring-boot:run`
Open `/`, `/blog`, one post, `/login`, then log in and **save each of the four admin forms** — a form posting a field the entity no longer has is the failure this catches.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Delete the locale infrastructure and the Russian content columns"
```

---

## Task 7: Back up and drop the nine columns (Spring, manual, gated)

**GATE: the column drop must not run until Task 6 is deployed and the live site is verified.** Dropping first breaks the running instance, which is still selecting these columns on every request.

**ORDERING AMENDED (Ruling R6, found during Task 5; rationale corrected).** This
task originally read deploy-then-backup; the backup now runs FIRST.

The precise hazard: with Task 5 deployed but **not** Task 6, the entities still map
the `*Ru` fields while the admin forms no longer submit them, so
`AdminController:149` and its siblings write `null` over that row's Russian on the
next save. Deploying Tasks 5 and 6 **together**, which is what this plan does,
avoids that entirely — Task 6 unmaps the fields, so Hibernate stops emitting those
columns in its UPDATE and leaves the data untouched.

So the nulling does not fire on the intended path. The backup still moves first for
two reasons: it costs one minute and removes the failure mode completely if the two
commits ever ship separately (a partial deploy, a rollback that lands between them),
and backing up before any migration that touches the data is the order you want
regardless of which specific mechanism you have reasoned your way out of.

**Files:**
- Create: `$HOME/Desktop/ru-site_profile.csv`, `ru-work.csv`, `ru-projects.csv`,
  `ru-blog.csv` (outside both repos, never committed)

**Interfaces:**
- Consumes: Task 6 committed (not yet deployed).
- Produces: nothing in code — this is a schema change only.

- [ ] **Step 1: Back up the Russian content — BEFORE deploying**

Muhammad runs this — the Supabase credentials are env-injected on Render and are
not in the repo. Production is still running the old code at this point, so every
`*_ru` value is still intact.

`psql`'s `\copy` does not expand `~` — it is a client-side meta-command, not a
shell word, so a tilde inside the quoted path is written as a literal directory
name. Use `$HOME`, expanded by the shell before psql sees it:

```bash
OUT="$HOME/Desktop"
psql "$DB_URL" -c "\copy (SELECT id, tagline_ru FROM site_profile) TO '$OUT/ru-site_profile.csv' CSV HEADER"
psql "$DB_URL" -c "\copy (SELECT id, role_ru, location_ru, summary_ru FROM work_experiences) TO '$OUT/ru-work.csv' CSV HEADER"
psql "$DB_URL" -c "\copy (SELECT id, tagline_ru, description_ru FROM projects) TO '$OUT/ru-projects.csv' CSV HEADER"
psql "$DB_URL" -c "\copy (SELECT id, title_ru, excerpt_ru, content_ru FROM blog_posts) TO '$OUT/ru-blog.csv' CSV HEADER"
```

- [ ] **Step 2: Confirm the backup is real**

```bash
wc -l "$HOME"/Desktop/ru-*.csv
```
Expected: each file has a header plus at least one row. **If any file is empty or
missing, stop — Step 5 is irreversible and nothing else recovers this text.**

- [ ] **Step 3: Deploy Tasks 5-6 and verify**

Push the branch, merge, let Render build. Open the live site: `/`, `/blog`, a post,
`/login`, `/healthz`. Expected: all 200, all English, no `??key_en??` anywhere in
the page source. **The nine columns still exist at this point and are simply
unread.**

- [ ] **Step 4: Drop the columns**

Column names are confirmed against the local mirror of this schema — all nine
exist with exactly these snake_case names. Re-confirm against production first:

```sql
SELECT table_name, column_name FROM information_schema.columns WHERE column_name LIKE '%_ru';
```

```sql
ALTER TABLE site_profile     DROP COLUMN tagline_ru;
ALTER TABLE work_experiences DROP COLUMN role_ru,
                             DROP COLUMN location_ru,
                             DROP COLUMN summary_ru;
ALTER TABLE projects         DROP COLUMN tagline_ru,
                             DROP COLUMN description_ru;
ALTER TABLE blog_posts       DROP COLUMN title_ru,
                             DROP COLUMN excerpt_ru,
                             DROP COLUMN content_ru;
```

- [ ] **Step 5: Verify the site still serves**

Reload `/`, `/blog`, a post. Expected: 200 and unchanged English content.
