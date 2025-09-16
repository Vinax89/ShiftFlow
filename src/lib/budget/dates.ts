import { DateTime, Interval } from 'luxon'
import type { PeriodConfig } from './types'

export const iso = (d: DateTime) => d.toISODate()!

export function boundsFor(dateISO: string, cfg: PeriodConfig, tz: string) {
  const d = DateTime.fromISO(dateISO, { zone: tz })
  switch (cfg.type) {
    case 'monthly': {
      const startDay = cfg.monthly?.startDay ?? 1
      const sCand = d.set({ day: startDay })
      const s = d.day < startDay ? sCand.minus({ months: 1 }) : sCand
      const e = s.plus({ months: 1 }).minus({ days: 1 })
      return Interval.fromDateTimes(s.startOf('day'), e.endOf('day'))
    }
    case 'semi_monthly': {
      const [d1, d2] = cfg.semi_monthly!.days
      const s1 = d.set({ day: d1 })
      const s2 = d.set({ day: d2 })
      const s = d.day < d1 ? s1.minus({ months: 1 }) : (d.day < d2 ? s1 : s2)
      const e = s.equals(s1) ? s2.minus({ days: 1 }) : s.plus({ months: 1 }).set({ day: d1 }).minus({ days: 1 })
      return Interval.fromDateTimes(s.startOf('day'), e.endOf('day'))
    }
    case 'weekly': {
      const want = cfg.weekly!.anchorDow // 0..6 Sun..Sat
      const weekdayLux = want === 0 ? 7 : want // luxon: 1..7
      const sCand = d.set({ weekday: weekdayLux })
      const s = d.weekday < (weekdayLux || 7) ? sCand.minus({ weeks: 1 }) : sCand
      const e = s.plus({ days: 6 })
      return Interval.fromDateTimes(s.startOf('day'), e.endOf('day'))
    }
    case 'biweekly': {
      const anchor = DateTime.fromISO(cfg.biweekly!.anchorDate, { zone: tz }).startOf('day')
      const diffDays = d.startOf('day').diff(anchor, 'days').days
      const offsetWeeks = Math.floor(Math.max(0, diffDays) / 14)
      const s = anchor.plus({ weeks: offsetWeeks * 2 })
      const e = s.plus({ days: 13 })
      return Interval.fromDateTimes(s, e.endOf('day'))
    }
  }
}
