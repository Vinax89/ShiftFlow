import { NextRequest } from 'next/server'
import { z } from 'zod'
import { adminAuth, adminDb } from '@/lib/admin'
import { hash64 } from '@/lib/hashing/xxhash'
import { periodKeyFor } from '@/lib/budget/keys'
import { computePeriod } from '@/lib/budget/compute'
import type { PlanDoc, EnvelopeDoc, PeriodDoc, Txn } from '@/lib/budget/types'

const Body = z.object({
  tenantId: z.string(),
  planId: z.string().optional(),
  dates: z.array(z.string()).min(1)
})

async function getUid(req: NextRequest): Promise<string|null> {
  const bypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1' && req.headers.get('x-dev-auth-uid')
  if (bypass) return String(bypass)
  const authz = req.headers.get('authorization') || ''
  if (!authz.startsWith('Bearer ')) return null
  try { const d = await adminAuth.verifyIdToken(authz.slice(7)); return d.uid } catch { return null }
}

async function ensureBaselinePlan(tenantId: string) {
  // Create tenant doc + baseline plan + a few envelopes if they don't exist
  const tenantRef = adminDb.doc(`tenants/${tenantId}`)
  const planId = 'baseline'
  const planRef = adminDb.doc(`tenants/${tenantId}/budget_plans/${planId}`)
  await adminDb.runTransaction(async (trx) => {
    const tSnap = await trx.get(tenantRef)
    if (!tSnap.exists) {
      trx.set(tenantRef, { activePlanId: planId, tz: 'UTC', createdAt: Date.now(), updatedAt: Date.now() })
    } else if (!(tSnap.data() as any)?.activePlanId) {
      trx.set(tenantRef, { activePlanId: planId, updatedAt: Date.now() }, { merge: true })
    }
    const pSnap = await trx.get(planRef)
    if (!pSnap.exists) {
      const plan: PlanDoc = {
        name: 'Baseline',
        active: true,
        currency: 'USD',
        tz: (tSnap.data() as any)?.tz || 'UTC',
        periodConfig: { type: 'monthly', monthly: { startDay: 1 } },
        rolloverPolicy: { positive: 'carry', negative: 'cap_zero' },
      } as any
      trx.set(planRef, { ...plan, createdAt: Date.now(), updatedAt: Date.now() }, { merge: true })
    }
  })
  // Ensure a few default envelopes exist (idempotent)
  const defaults: Array<EnvelopeDoc & { id: string }> = [
    { id: 'Groceries', name: 'Groceries', group: 'needs', type: 'flex', plannedCents: 40000, sort: 1 } as any,
    { id: 'Dining', name: 'Dining', group: 'wants', type: 'flex', plannedCents: 15000, sort: 2 } as any,
    { id: 'Transport', name: 'Transport', group: 'needs', type: 'flex', plannedCents: 20000, sort: 3 } as any,
  ]
  for (const e of defaults) {
    const ref = adminDb.doc(`tenants/${tenantId}/budget_plans/baseline/envelopes/${e.id}`)
    const snap = await ref.get()
    if (!snap.exists) await ref.set({ ...e, createdAt: Date.now(), updatedAt: Date.now() })
  }
  return 'baseline'
}

export async function POST(req: NextRequest) {
  try {
    const uid = await getUid(req)
    if (!uid) return new Response('Unauthorized', { status: 401 })
    const parsed = Body.parse(await req.json())
    const { tenantId, dates } = parsed
    let { planId } = parsed

    if (!planId) {
      const tSnap = await adminDb.doc(`tenants/${tenantId}`).get()
      planId = (tSnap.exists && (tSnap.data() as any)?.activePlanId) || 'baseline'
    }

    // Ensure plan exists (first-run bootstrap for new projects)
    const pTry = await adminDb.doc(`tenants/${tenantId}/budget_plans/${planId}`).get()
    if (!pTry.exists) {
      planId = await ensureBaselinePlan(tenantId)
    }

    // Load plan + envelopes
    const planSnap = await adminDb.doc(`tenants/${tenantId}/budget_plans/${planId}`).get()
    if (!planSnap.exists) return new Response('plan not found', { status: 404 })
    const plan = planSnap.data() as PlanDoc
    const envSnaps = await adminDb.collection(`tenants/${tenantId}/budget_plans/${planId}/envelopes`).get()
    const envelopes: EnvelopeDoc[] = envSnaps.docs.map(d => ({ id: d.id, ...(d.data() as any) }))

    // Load txns + splits overlay
    const [txSn, idxSn] = await Promise.all([
      adminDb.collection(`tenants/${tenantId}/transactions`).get(),
      adminDb.collection(`tenants/${tenantId}/budget_tx_index`).get(),
    ])
    const idx = new Map(idxSn.docs.map(d => [d.id, d.data() as any]))
    const txnsRaw = txSn.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
    const toISO = (v: any) => {
      // Accept Firestore Timestamp, millis, or ISO string
      if (v?.toDate) return v.toDate() as Date
      if (typeof v === 'number') return new Date(v)
      if (typeof v === 'string') return new Date(v)
      return new Date(NaN)
    }

    const results: any[] = []
    for (const dateISO of dates) {
      const key = periodKeyFor(dateISO, plan.periodConfig, plan.tz)
      // Coalesce rapid repeats: if a lock exists updated < 2s ago, skip recompute
      const lockRef = adminDb.doc(`tenants/${tenantId}/locks/recompute_${key}`)
      const lockSnap = await lockRef.get()
      const now = Date.now()
      const recent = lockSnap.exists && now - ((lockSnap.data() as any).updatedAt ?? 0) < 2000
      await lockRef.set({ updatedAt: now }, { merge: true })
      if (recent) {
        results.push({ dateISO, periodKey: key, ok: true, skipped: true })
        continue
      }

      const prevKey = (() => {
        const d = new Date(dateISO); d.setDate(d.getDate() - 1)
        const ymd = d.toISOString().slice(0, 10)
        return periodKeyFor(ymd, plan.periodConfig, plan.tz)
      })()

      const txns: Txn[] = txnsRaw.map(x => {
        const dt = toISO(x.date)
        const splits = (idx.get(x.id)?.splits || []) as Array<{envId:string, amountCents:number}>
        return {
          id: x.id,
          date: isNaN(dt.valueOf()) ? '1970-01-01' : dt.toISOString().slice(0,10),
          amountCents: x.amountCents ?? 0,
          splits
        }
      })

      const prevSnap = await adminDb.doc(`tenants/${tenantId}/budget_plans/${planId}/periods/${prevKey}`).get()
      const prev = prevSnap.exists ? (prevSnap.data() as PeriodDoc) : undefined

      const computed = computePeriod({ dateISO, plan, envelopes, txns, prevPeriod: prev })
      const inputsHash = await hash64(JSON.stringify({ plan, envelopes, txs: txns.map(t=>[t.id,t.amountCents]), dateISO }))

      const pRef = adminDb.doc(`tenants/${tenantId}/budget_plans/${planId}/periods/${key}`)
      const existing = await pRef.get()
      const prevVersion = existing.exists ? (existing.data() as any).periodVersion ?? 0 : 0
      await pRef.set({ ...computed, inputsHash, periodVersion: prevVersion + 1, status: 'ready', updatedAt: Date.now(), planSnapshotVersion: prevVersion + 1 }, { merge: true })
      await adminDb.collection(`tenants/${tenantId}/budget_ledger`).add({ type: 'recompute', periodKey: key, inputsHash, createdAt: Date.now() })

      results.push({ dateISO, periodKey: key, ok: true })
    }
    return Response.json({ results })
  } catch (e: any) {
    console.error('recompute error:', e?.stack || e)
    return new Response(e?.message || 'error', { status: 500 })
  }
}
