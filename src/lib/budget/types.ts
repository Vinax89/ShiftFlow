export type PeriodType = 'monthly'|'semi_monthly'|'biweekly'|'weekly'
export type RolloverPos = 'carry'
export type RolloverNeg = 'cap_zero'
export type RolloverOverride = 'inherit'|'no_carry'|'carry'

export interface PeriodConfig {
  type: PeriodType
  monthly?: { startDay: number }
  semi_monthly?: { days: [number, number] }
  weekly?: { anchorDow: number } // 0..6 (Sun..Sat)
  biweekly?: { anchorDate: string } // ISO date for the anchor payday
  exceptions?: Array<{ date: string, shift: 'prev'|'next'|'skip' }>
}

export interface PlanDoc {
  name: string
  active: boolean
  currency: 'USD'
  tz: string
  periodConfig: PeriodConfig
  rolloverPolicy: { positive: RolloverPos; negative: RolloverNeg }
  createdAt?: number
  updatedAt?: number
}

export interface EnvelopeDoc {
  id: string
  name: string
  group: 'needs'|'wants'|'savings'|'income'|'debt'
  type: 'fixed'|'flex'|'sinking'
  plannedCents: number
  rolloverOverride?: RolloverOverride
  allocationRules?: Array<{ source: 'paycheck'|'income'; pct: number }>
  archived?: boolean
  sort?: number
}

export interface PeriodEnvelope {
  envId: string
  plannedCents: number
  carryInCents: number
  actualCents: number
  remainingCents: number
  deficitCents: number
}

export interface PeriodDoc {
  planSnapshotVersion: number
  inputsHash: string
  startDate: string
  endDate: string
  tz: string
  envelopes: PeriodEnvelope[]
  incomeCents: number
  periodVersion: number
  status: 'ready'|'computing'|'stale'
  updatedAt: number
}

export type Txn = { id: string, date: string, amountCents: number, splits?: Array<{envId: string, amountCents: number}> }
