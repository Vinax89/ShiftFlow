import { NextRequest } from 'next/server'
import { adminDb } from '@/lib/admin'
import { periodKeyFor } from '@/lib/budget/keys'

function todayISO(tz = 'UTC') { return new Date().toISOString().slice(0,10) }

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const tenantId = url.searchParams.get('tenantId') || 'dev'
    const dateISO = url.searchParams.get('date') || todayISO()
    const tSnap = await adminDb.doc(`tenants/${tenantId}`).get()
    const planId = (tSnap.exists && (tSnap.data() as any)?.activePlanId) || 'baseline'
    const planSnap = await adminDb.doc(`tenants/${tenantId}/budget_plans/${planId}`).get()
    if (!planSnap.exists) return new Response('plan not found', { status: 404 })
    const plan: any = planSnap.data()
    const key = periodKeyFor(dateISO, plan.periodConfig, plan.tz || 'UTC')
    const pRef = adminDb.doc(`tenants/${tenantId}/budget_plans/${planId}/periods/${key}`)
    const pSnap = await pRef.get()
    if (!pSnap.exists) return new Response('period not found', { status: 404 })
    return Response.json(pSnap.data())
  } catch (e: any) {
    console.error('read error:', e?.stack || e)
    return new Response(e?.message || 'error', { status: 500 })
  }
}
