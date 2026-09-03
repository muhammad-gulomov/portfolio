import { raw } from 'hono/html'
import type { SiteProfile, WorkExperience } from '../../types'
import { renderSummary } from '../../content/summary'
import {
  TelegramIcon, MailIcon, GitHubIcon, LinkedInIcon, InstagramIcon,
} from '../icons'

type Lang = 'en' | 'ru'
type TFn = (key: string, ...args: (string | number)[]) => string

interface HomeProps {
  owner: SiteProfile
  work: WorkExperience[]
  workPeriods: Record<number, string>
  t: TFn
  lang: Lang
}

/**
 * Profile fields are entered by hand in the admin CMS, so a value may
 * arrive as a full URL or as a bare host. Normalising here keeps a
 * missing scheme from silently becoming a relative link.
 */
function href(value: string | null | undefined): string | null {
  const v = (value ?? '').trim()
  if (!v) return null
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

/**
 * fmtPeriod joins its two halves with " — ". Splitting on that lets the
 * terminal word ("Present" / "н.в.") carry the accent on its own while
 * fmtPeriod keeps its single-string contract, which the route and its
 * tests both depend on.
 */
function splitPeriod(period: string): [string, string | null] {
  const at = period.lastIndexOf(' — ')
  if (at === -1) return [period, null]
  return [period.slice(0, at + 3), period.slice(at + 3)]
}

type Mark = typeof TelegramIcon
type Contact = { label: string; url: string; Icon: Mark }

function add(into: Contact[], label: string, url: string | null, Icon: Mark) {
  if (url) into.push({ label, url, Icon })
}

function ContactLink({ c }: { c: Contact }) {
  const external = !c.url.startsWith('mailto:')
  return (
    <a href={c.url} {...(external ? { target: '_blank', rel: 'noopener' } : {})}>
      <c.Icon />
      <span class="label">{c.label}</span>
    </a>
  )
}

export function Home({ owner, work, workPeriods, t }: HomeProps) {
  // Two groups, not one undifferentiated row: how to reach him, then where to
  // read about him — the second ordered from most professional to least.
  // The wider gap between the groups is the only thing marking the split;
  // no divider or label is needed to make it legible.
  const reach: Contact[] = []
  add(reach, t('cta.telegram'), href(owner.telegram), TelegramIcon)
  add(reach, t('cta.email'), owner.email?.trim() ? `mailto:${owner.email.trim()}` : null, MailIcon)

  const find: Contact[] = []
  add(find, 'GitHub', href(owner.github), GitHubIcon)
  add(find, 'LinkedIn', href(owner.linkedin), LinkedInIcon)
  add(find, 'Instagram', href(owner.instagram), InstagramIcon)

  return (
    <div class="sheet">
      <div class="stack">

        {/* Intro left, portrait right; the work ledger runs full width beneath
            them. Keeping the ledger out of this row is what lets its three
            columns stay wide enough to read. */}
        <header class="intro">
          <div class="intro-text">
            {/* raw() because the intro names the products it links to, and a
                link inside a sentence cannot be expressed as plain text. The
                strings are constants in messages.ts, not CMS content. */}
            <p class="lede">{raw(t('intro.p1'))}</p>
            <p class="lede">{raw(t('intro.p2'))}</p>
          </div>

          {owner.photoPath?.trim() && (
            <div class="portrait">
              {/* Intrinsic dimensions reserve the box before the file lands, so
                  nothing reflows on load. Not lazy: above the fold everywhere. */}
              <img
                src={owner.photoPath}
                alt={`Portrait of ${owner.name}`}
                width="520"
                height="694"
                decoding="async"
              />
            </div>
          )}
        </header>

        <section class="work" id="work">
          <h2 class="work-title">{t('work.title')}</h2>
          <div class="ledger">

          {work.length === 0
            ? <p class="empty">{t('work.empty')}</p>
            : work.map((w) => {
              const [span, terminal] = splitPeriod(workPeriods[w.id] ?? '')
              const companyUrl = href(w.url)
              return (
                <article class="role" key={w.id}>
                  <div class="role-line">
                    <span class="company">
                      {companyUrl
                        ? <a href={companyUrl} target="_blank" rel="noopener">{w.company}</a>
                        : w.company}
                    </span>
                    <span class="role-title">{w.role}</span>
                    <span class="period">
                      {span}
                      {terminal && (
                        w.endDate === null
                          ? <span class="now">{terminal}</span>
                          : terminal
                      )}
                    </span>
                  </div>

                  {/* Escaped then link-upgraded — see content/summary.ts.
                      Never pass a raw CMS string to raw(). */}
                  {w.summary?.trim() && (
                    <p class="summary">{raw(renderSummary(w.summary))}</p>
                  )}

                </article>
              )
            })}
          </div>
        </section>

      </div>

      {/* A page footer, not the tail of the content: it spans the full sheet so
          it lines up with the intro's left edge and the period column's right
          edge. .stack's auto margins absorb the space above it, which is what
          holds this at the bottom of the viewport. */}
      <footer class="contacts">
        {/* One wrapper so the two groups share a single gap rule and centre
            as one unit. */}
        <div class="contact-links">
          {reach.length > 0 && (
            <span class="group">
              {reach.map((c) => <ContactLink key={c.label} c={c} />)}
            </span>
          )}
          {find.length > 0 && (
            <span class="group">
              {find.map((c) => <ContactLink key={c.label} c={c} />)}
            </span>
          )}
        </div>
      </footer>
    </div>
  )
}
