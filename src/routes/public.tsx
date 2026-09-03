import { Hono } from 'hono'
import type { Env, Vars } from '../types'
import type { Lang } from '../i18n/messages'
import { listWork } from '../db/work'
import { Home } from '../views/pages/Home'

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн',
                   'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function fmtPeriodDate(iso: string, lang: Lang): string {
  const parts = iso.split('-')
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1] ?? '1', 10) - 1
  const months = lang === 'ru' ? MONTHS_RU : MONTHS_EN
  return `${months[month]} ${year}`
}

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

publicRoutes.get('/blog', (c) => c.redirect('/', 302))
publicRoutes.get('/blog/:slug', (c) => c.redirect('/', 302))

publicRoutes.get('/', async (c) => {
  const work = await listWork(c.env.DB)
  const t = c.get('t')
  const lang = c.get('lang')

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
      t={t}
      lang={lang}
      currentYear={c.get('currentYear')}
    />,
    { title: c.get('owner').name, css: 'home' },
  )
})

export default publicRoutes
