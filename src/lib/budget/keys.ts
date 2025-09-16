import { DateTime } from 'luxon'
import type { PeriodConfig } from './types'
import { boundsFor } from './dates'

export function periodKeyFor(dateISO: string, cfg: PeriodConfig, tz: string): string {
  const dt = DateTime.fromISO(dateISO, { zone: tz })
  switch (cfg.type) {
    case 'monthly': return dt.toFormat('yyyy-MM')
    case 'semi_monthly': return `${dt.toFormat('yyyy-MM')}-${dt.day < (cfg.semi_monthly!.days[1]) ? 'S1' : 'S2'}`
    case 'weekly': return dt.toFormat("kkkk-'W'WW")
    case 'biweekly': {
      const b = boundsFor(dateISO, cfg, tz).start
      const anchor = DateTime.fromISO(cfg.biweekly!.anchorDate, { zone: tz })
      const idx = Math.floor(b.diff(anchor, 'weeks').weeks / 2)
      return `${b.toFormat('yyyy')}-BW${String(idx).padStart(2,'0')}`
    }
  }
}
