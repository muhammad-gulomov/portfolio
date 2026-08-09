import { describe, it, expect } from 'vitest'
import {
  CRON_EVENING,
  CRON_MORNING,
  dateInGmtPlus5,
  formatHumanDate,
  nextDateGmtPlus5,
  previousDateGmtPlus5,
} from '../src/telegram/time'

describe('telegram time', () => {
  it('maps known UTC instants to GMT+5 calendar dates', () => {
    // 2026-08-09 23:30 UTC → 2026-08-10 04:30 GMT+5
    expect(dateInGmtPlus5(new Date('2026-08-09T23:30:00.000Z'))).toBe('2026-08-10')
    // 2026-08-09 18:59 UTC → 2026-08-09 23:59 GMT+5
    expect(dateInGmtPlus5(new Date('2026-08-09T18:59:00.000Z'))).toBe('2026-08-09')
  })

  it('previousDateGmtPlus5 subtracts one civil day', () => {
    expect(previousDateGmtPlus5('2026-08-09')).toBe('2026-08-08')
    expect(previousDateGmtPlus5('2026-03-01')).toBe('2026-02-28')
  })

  it('nextDateGmtPlus5 adds one civil day', () => {
    expect(nextDateGmtPlus5('2026-08-09')).toBe('2026-08-10')
  })

  it('formatHumanDate uses ordinal day and month name', () => {
    expect(formatHumanDate('2026-08-10')).toBe('10th August 2026')
    expect(formatHumanDate('2026-08-01')).toBe('1st August 2026')
    expect(formatHumanDate('2026-08-22')).toBe('22nd August 2026')
    expect(formatHumanDate('2026-08-23')).toBe('23rd August 2026')
  })

  it('cron expressions match 08:00 and 20:00 GMT+5', () => {
    expect(CRON_MORNING).toBe('0 3 * * *')
    expect(CRON_EVENING).toBe('0 15 * * *')
  })
})
