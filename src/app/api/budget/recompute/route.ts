import { NextRequest } from 'next/server'
import { z } from 'zod'
import { adminAuth, adminDb } from '@/lib/admin'
import { hash64 } from '@/lib/hashing/xxhash'
import { periodKeyFor } from '@/lib/budget/keys'
import { computePeriod } from '@/lib/budget/compute'
import type { PlanDoc, EnvelopeDoc, PeriodDoc, Txn } from '@/lib/budget/types'

const Body = z.object({ tenantId: z.string(), planId: z.string(), dates: z.array(z.string()).min(1) })

async function getUid(req: NextRequest): Promise<string|null> {
  const bypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1' && req.headers.get('x-dev-auth-uid')
  if (bypass) return String(bypass)
  const authz = req.headers.get('authorization') || ''
  if (!authz.startsWith('Bearer ')) return null
  try { const d = await adminAuth.verifyIdToken(authz.slice(7)); return d.uid } catch { return null }
}

export async function POST(req: NextRequest) {
  const uid = await getUid(req)
  if (!uid) return new Response('Unauthorized', { status: 401 })
  const { tenantId, planId, dates } = Body.parse(await req.json())

  // Load plan
  const planSnap = await adminDb.doc(`tenants/${tenantId}/budget_plans/${planId}`).get()
  if (!planSnap.exists) return new Response('plan not found', { status: 404 })
  const plan = planSnap.data() as PlanDoc

  // Envelopes
  const envSnaps = await adminDb.collection(`tenants/${tenantId}/budget_plans/${planId}/envelopes`).get()
  const envelopes: EnvelopeDoc[] = envSnaps.docs.map(d => ({ id: d.id, ...(d.data() as any) }))

  // Load txns + manual splits overlay for each date window (simple load for MVP)
  const results: any[] = []
  for (const dateISO of dates) {
    // Derive prev period
    const key = periodKeyFor(dateISO, plan.periodConfig, plan.tz)
    const prevKey = (() => {
      // rough prev by subtracting a day from start bounds; recompute key
      const d = new Date(dateISO); d.setDate(d.getDate()-1)
      const ymd = d.toISOString().slice(0,10)
      return periodKeyFor(ymd, plan.periodConfig, plan.tz)
    })()

    const [txSn, idxSn] = await Promise.all([
      adminDb.collection(`tenants/${tenantId}/transactions`).get(),
      adminDb.collection(`tenants/${tenantId}/budget_tx_index`).get(),
    ])
    const idx = new Map(idxSn.docs.map(d => [d.id, d.data() as any]))
    const txns: Txn[] = txSn.docs.map(d => {
      const x = d.data() as any
      const splits = (idx.get(d.id)?.splits || []) as Array<{envId:string, amountCents:number}>
      return { id: d.id, date: new Date(x.date).toISOString().slice(0,10), amountCents: x.amountCents, splits }
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
}
