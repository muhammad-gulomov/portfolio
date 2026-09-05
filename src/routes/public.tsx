import { Hono } from 'hono'
import type { Env, Vars } from '../types'
import { listWork } from '../db/work'
import { Home } from '../views/pages/Home'

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

const publicRoutes = new Hono<{ Bindings: Env; Variables: Vars }>()

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

publicRoutes.get('/blog', (c) => c.redirect('/', 302))
publicRoutes.get('/blog/:slug', (c) => c.redirect('/', 302))

publicRoutes.get('/', async (c) => {
  const work = await listWork(c.env.DB)
  const t = c.get('t')

  const present = t('work.present')
  const workPeriods: Record<number, string> = {}
  for (const w of work) {
    workPeriods[w.id] = fmtPeriod(w.startDate, w.endDate, present)
  }

  return c.render(
    <Home
      owner={c.get('owner')}
      work={work}
      workPeriods={workPeriods}
      t={t}
    />,
    { title: c.get('owner').name, css: 'home' },
  )
})

export default publicRoutes
