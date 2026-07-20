import { Hono } from 'hono'
import type { Env, Vars } from '../types'
import type { Lang } from '../i18n/messages'
import { listWork } from '../db/work'
import { listProjects } from '../db/project'
import { latest } from '../db/blog'
import { Home } from '../views/pages/Home'

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн',
                   'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

/**
 * Format an ISO date string (e.g. "2022-01-01" or "2022-01") into "Jan 2022".
 * Accepts full ISO timestamps and partial YYYY-MM strings.
 */
function fmtPeriodDate(iso: string, lang: Lang): string {
  const parts = iso.split('-')
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1] ?? '1', 10) - 1 // 0-based
  const months = lang === 'ru' ? MONTHS_RU : MONTHS_EN
  return `${months[month]} ${year}`
}

/**
 * Build the period label for a work entry, e.g.:
 *   "Jan 2022 — Present"
 *   "Jan 2022 — Mar 2024"
 */
export function fmtPeriod(
  startDate: string,
  endDate: string | null,
  presentLabel = 'Present',
  lang: Lang = 'en',
): string {
  const start = fmtPeriodDate(startDate, lang)
  const end = endDate ? fmtPeriodDate(endDate, lang) : presentLabel
  return `${start} — ${end}`
}

const publicRoutes = new Hono<{ Bindings: Env; Variables: Vars }>()

publicRoutes.get('/', async (c) => {
  const DB = c.env.DB
  const t = c.get('t')
  const lang = c.get('lang')
  const [work, projects, posts] = await Promise.all([
    listWork(DB),
    listProjects(DB),
    latest(DB, 3),
  ])

  const present = t('work.present')
  const workPeriods: Record<number, string> = {}
  for (const w of work) {
    workPeriods[w.id] = fmtPeriod(w.startDate, w.endDate, present, lang)
  }

  return c.render(
    <Home
      owner={c.get('owner')}
      work={work}
      workPeriods={workPeriods}
      projects={projects}
      latestPosts={posts}
      t={t}
      lang={lang}
    />,
    { title: c.get('owner').name, css: 'home' },
  )
})

export default publicRoutes
