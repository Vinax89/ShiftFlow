import type { EnvelopeDoc, PeriodDoc, PlanDoc, Txn } from './types'
import { iso, boundsFor } from './dates'

export function sumAssigned(txns: Txn[], envId: string){
  let s = 0
  for (const t of txns) for (const sp of (t.splits||[])) if (sp.envId===envId) s += sp.amountCents
  return s
}

export function computePeriod({
  dateISO, plan, envelopes, txns, prevPeriod
}: {
  dateISO: string,
  plan: PlanDoc,
  envelopes: Array<EnvelopeDoc>,
  txns: Txn[],
  prevPeriod?: PeriodDoc
}): Omit<PeriodDoc,'inputsHash'|'periodVersion'|'status'|'updatedAt'|'planSnapshotVersion'> {
  const iv = boundsFor(dateISO, plan.periodConfig, plan.tz)
  const startDate = iso(iv.start), endDate = iso(iv.end)
  const periodTxns = txns.filter(t => t.date >= startDate && t.date <= endDate)

  const periodEnvs = envelopes.map(e => {
    const planned = e.plannedCents
    // Resolve carry-in
    let carryIn = 0
    const override = e.rolloverOverride ?? 'inherit'
    const allowCarry = override === 'carry' || (override === 'inherit' && plan.rolloverPolicy.positive === 'carry')
    if (allowCarry) {
      const prevLine = prevPeriod?.envelopes.find(x => x.envId === e.id)
      const prevRem = (prevLine?.remainingCents ?? 0)
      carryIn = Math.max(prevRem, 0)
    }
    const actual = sumAssigned(periodTxns, e.id)
    const remaining = planned + carryIn - actual
    const deficit = Math.max(actual - planned - carryIn, 0)
    return { envId: e.id, plannedCents: planned, carryInCents: carryIn, actualCents: actual, remainingCents: remaining, deficitCents: deficit }
  })

  const incomeCents = periodTxns.filter(t => t.amountCents > 0).reduce((a,b)=>a+b.amountCents,0)
  return { tz: plan.tz, startDate, endDate, envelopes: periodEnvs, incomeCents }
}
