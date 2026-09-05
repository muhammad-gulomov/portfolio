# Remove Russian, retire multilanguage

**Date:** 2026-09-05
**Status:** Approved design
**Repos:** `java/kanzen` (Hono + D1, deploy pending) and `java/portfolio` (Spring Boot + Supabase, live)

## Goal

The portfolio ships in English only. Remove Russian content, the translation
machinery that served it, and every public signal that a second language exists.

"No multilanguage anymore" is read strictly: not "one language selected by
default", but *no locale layer at all*. A future second language would be a new
feature, not a flag flip.

## Non-goals

- No copy rewriting. English strings move verbatim from their tables to their
  use sites.
- No visual redesign. Removing the picker leaves the theme toggle alone in the
  topbar; that is the intended end state, not a layout task.
- No touching the Telegram cleaning bot, which is already English-only by
  design (see `2026-08-09-telegram-cleaning-bot-design.md`).

## Decisions

**The `t()` / MessageSource indirection is deleted, not reduced to one table.**
A key-to-string lookup earns its indirection by having something to switch
between. With one language it only hides the words from the file that renders
them. Rejected: keeping `messages.ts` as a single-language copy table (smaller
diff, but preserves a layer whose only purpose is gone).

**Spring column removal is sequenced expand/contract, code before schema.**
`spring.jpa.hibernate.ddl-auto=update` never drops columns, so removing the
entity fields leaves nine orphaned columns in Supabase. Dropping them requires
hand-written SQL. That SQL must run *after* the new code is live: the running
instance has Hibernate emitting `SELECT ... tagline_ru ...` on every request,
so dropping first 500s the site until the deploy lands. Rejected: one combined
change (a window where live code references dead columns).

**`/?lang=ru` is ignored rather than redirected.** The param stops meaning
anything and the URL serves English. `<link rel="canonical">` pointing at the
bare origin consolidates the ranking signal, which is the mechanism that
matters. Rejected: a 301 stripping the param — correct but adds a permanent
redirect rule for a parameter no code reads.

**The 365-day `lang` cookie is left to expire.** Nothing reads it once the
middleware and `CookieLocaleResolver` are gone, so it is inert. Rejected:
emitting an expiry header, which means shipping cookie-clearing code on every
response to tidy a value with no effect.

**Deleting `LocaleConfig` does not leave the Spring app with no locale — it
leaves Spring's implicit `AcceptHeaderLocaleResolver`.** A Spring MVC app
always resolves *some* `Locale` for the request; removing the locale layer
only removes whoever was pinning it. `LocaleConfig` was also calling
`CookieLocaleResolver.setDefaultLocale(Locale.ENGLISH)`, which is why
`application.properties` must now set `spring.web.locale=en` with
`spring.web.locale-resolver=fixed` — otherwise a visitor's `Accept-Language`
header drives `#temporals.format(...)` output directly.

## Part 1 — kanzen (first: 170 passing tests, not yet live)

Order matters — inline the strings before deleting their source.

1. **Inline chrome copy.** Move the **36** `EN` strings from
   `src/i18n/messages.ts` into their call sites in `views/Layout.tsx`,
   `views/pages/Home.tsx`, `BlogList.tsx`, `BlogPost.tsx`, `Login.tsx`.

   **Five** strings were rendered through `raw()`; **four** must keep that
   wrapper: `Home.tsx:135` (`intro.p2`), `BlogList.tsx:35` (`blog.title`),
   `Login.tsx:54` (`login.title`), `BlogPost.tsx:51` (`post.views`, which
   also takes an interpolated arg). `intro.p1` (`Home.tsx:134`) is the
   exception — it carries no markup, so it drops `raw()` and becomes plain
   text.
   The header comment in `messages.ts` claims only two do — it is stale, and
   trusting it would strip markup from three headings. Inlined, they stay
   compile-time constants, so the existing XSS argument holds unchanged.
   `post.views` keeps its `{0}` substitution as a template literal.
2. **Delete `src/i18n/`** — both files, including the already-orphaned
   `pick()` (defined, zero call sites) and the `Lang` type.
3. **Unwire the middleware.** Drop the `localeMiddleware` import and its
   `app.use` block from `src/index.tsx`; drop `lang` and `t` from `Vars` in
   `src/types.ts`.
4. **Drop the `lang` prop** from every view's props interface and every call
   site. `fmtListDate`, `fmtPostDate` (`BlogList.tsx:8`, `BlogPost.tsx:8`)
   hardcode `en-US`; `fmtPeriodDate` (`routes/public.tsx:12`) uses `MONTHS_EN`
   and `MONTHS_RU` is deleted. `fmtPeriod` keeps its `presentLabel` parameter
   and loses its `lang` parameter.
5. **SEO surface** (`views/Layout.tsx:125-145`): canonical becomes a constant
   `${SITE}/`; delete all three `hreflang` links, `og:locale:alternate`, and
   the `og:locale` ternary (fixed `en_US`). `<html lang="en">` is now literal.
6. **Sitemap** (`routes/public.tsx:36-52`): remove the `xhtml` namespace
   declaration and the three `xhtml:link` alternates, leaving one `<url>`.
7. **Picker UI:** markup at `Layout.tsx:197-226`; `.lang`, `.lang-trigger`,
   `.lang-menu` rules at `public/css/base.css:274-342` plus the
   `.lang-trigger` selector in the `max-width: 40rem` block at `:422`
   (leave the `.theme-toggle` rules beside it intact); and the
   entire language-menu section of `public/js/site.js:67-119` **including its
   `if (!trigger || !menu) return` guard**, so no unreachable script ships.
8. **Cyrillic typography:** delete `public/fonts/plex-cyrillic.woff2`, its
   `@font-face` (`base.css:26-32`), the conditional preload
   (`Layout.tsx:164-172`), and `'IBM Plex Sans'` from `--face`. Rewrite the
   two font comment blocks, which currently explain a Latin/Cyrillic split
   that no longer exists.
9. **Tests:** delete the Russian-months case (`test/public-routes.test.ts:144-146`);
   remove `lang`/`t` wiring from `test/pages.test.tsx` (the `t` import from
   `src/i18n/messages` disappears with the module). Add regression assertions
   that a rendered page contains no `hreflang`, no `data-lang-trigger`, and
   that `/sitemap.xml` contains no `xhtml`.

## Part 2 — Spring app (live; two commits with a deploy between)

### Commit A — code only, safe to deploy alone

**Java**

- Delete `config/LocaleConfig.java`, `component/LocalizedContent.java`,
  `component/RussianContentBackfill.java` (a `CommandLineRunner` that re-fills
  blank RU fields on *every* boot, not the one-shot its comment claims).
- Remove the 9 `*Ru` fields from `SiteProfile:34`, `WorkExperience:28,34,45`,
  `Project:26,32`, `BlogPost:28,34,40`.
- `AdminController:149` — drop `current.setTaglineRu(form.getTaglineRu())`.
- `BlogServiceImpl.withRendered():70-76` — the locale check that swaps in
  `getContentRu()` collapses to `p.setRenderedContent(markdown.render(p.getContent()))`.
- `WorkServiceImpl.periodLabel():44-52` — pin `Locale.ENGLISH` in the
  `DateTimeFormatter` and use a literal `"Present"`. This removes the last
  `MessageSource` consumer in the codebase, so drop the `messageSource` field
  (`:20`) and its imports (`:4,5,12`) too.

**Templates**

- Inline all **94 `#{key}` occurrences (87 unique keys)** across
  `home.html`, `login.html`, `blog/list.html`, `blog/post.html`,
  `fragments/header.html`, `fragments/footer.html`, taking English verbatim
  from `messages.properties`. Also the one `#messages.msg('meta.fallback')`
  in `fragments/head.html:22`.
- Delete `messages.properties` and `messages_ru.properties`.
- Unwrap all **15 `@i18n.pick(x, xRu)` occurrences** to plain `${x}`:
  `fragments/head.html:22`; `home.html:38,205,207,213,261,309,310`;
  `blog/list.html:39,40`; `blog/post.html:3,24,26` (**two calls on 26**)`,27`.
  Note `home.html:261` is `pick(p.tagline ?: p.description, …)` — the Elvis
  fallback on the English side is kept, only the RU argument goes.
  `blog/post.html:26` is a `th:if` emptiness guard that simplifies to
  `${post.excerpt != null and !#strings.isEmpty(post.excerpt)}`.
- Remove RU inputs from `admin/profile-form.html:58-59`,
  `admin/work-form.html:74-84`, `admin/project-form.html:40-45`,
  `admin/post-form.html:46-55`.
- Delete the flag switcher (`fragments/header.html:19-23`) and its
  `.lang-switch` CSS; replace `th:lang="${#locale.language}"` with a literal
  `lang="en"` in `home.html:2`, `login.html:2`, `blog/list.html:2`,
  `blog/post.html:2`.

Columns remain in Postgres at this point — orphaned, unread, harmless.

### Between the commits — back up, then deploy

1. `pg_dump` the nine columns (with primary keys) to a file outside the repo.
   **This is the only copy of that Russian prose that will exist afterward.**
   Requires the Supabase credentials, which are env-injected in production and
   not in the repo — Muhammad runs this step.
2. Deploy Commit A to Render. Verify `/`, `/blog`, a post, and `/healthz`.

### Commit B — schema, run by hand after the deploy is green

`ALTER TABLE ... DROP COLUMN` for all nine columns, executed against Supabase.
Irreversible; gated on the dump in step 1 existing.

## Verification

| Repo | Check |
|------|-------|
| kanzen | `npm test` — baseline is 22 files / 170 tests green; expect 169 plus the new regression cases |
| kanzen | `grep -rP '[\x{0400}-\x{04FF}]' src public` returns nothing |
| kanzen | `grep -rn "i18n\|hreflang\|lang=\|data-lang" src public` returns only the literal `<html lang="en">` in `Layout.tsx` and `Login.tsx` |
| Spring | `./mvnw -q package` compiles (repo has **zero tests** — `src/test/java/.../portfolio` is empty) |
| Spring | Manual pass on localhost: `/`, `/blog`, a post, `/login`, and all four admin forms save correctly |
| Spring | `grep -rn "Ru\b\|Russian\|Locale\|MessageSource\|#{" src/main` returns only `Locale.ENGLISH` and `import java.util.Locale;` in `WorkServiceImpl.java` |

## Risks

- **Data loss (accepted, mitigated).** Commit B destroys the Russian
  translations. Mitigated by the `pg_dump`; the app is being retired at
  cutover regardless.
- **No test net on the Spring side.** 94 hand-edited template sites with zero
  automated coverage. Mitigated by compilation plus the manual route pass; a
  missed `#{key}` renders as literal `??key_en??` in Thymeleaf, which is
  loud rather than silent.
- **Indexed `?lang=ru` URLs.** Google may hold the RU address. Canonical
  consolidation is the fix and takes a recrawl; no action beyond that.
