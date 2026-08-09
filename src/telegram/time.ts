/** Calendar date YYYY-MM-DD in Asia/Tashkent (GMT+5, no DST). */
export function dateInGmtPlus5(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** Previous calendar day YYYY-MM-DD in GMT+5. */
export function previousDateGmtPlus5(dayDate: string): string {
  const [y, m, d] = dayDate.split('-').map(Number)
  // Noon UTC avoids edge ambiguity; we only need day arithmetic on the date string.
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  utc.setUTCDate(utc.getUTCDate() - 1)
  const yy = utc.getUTCFullYear()
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(utc.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export const CRON_MORNING = '0 3 * * *' // 08:00 GMT+5
export const CRON_EVENING = '0 15 * * *' // 20:00 GMT+5
