import { NextRequest } from 'next/server'
import { z } from 'zod'
import { adminAuth, adminDb } from '@/lib/admin'
import { periodKeyFor } from '@/lib/budget/keys'

const Q = z.object({ tenantId: z.string(), planId: z.string().optional(), date: z.string().optional() })

async function getUid(req: NextRequest): Promise<string|null> {
  const bypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1' && req.headers.get('x-dev-auth-uid')
  if (bypass) return String(bypass)
  const authz = req.headers.get('authorization') || ''
  if (!authz.startsWith('Bearer ')) return null
  try { const d = await adminAuth.verifyIdToken(authz.slice(7)); return d.uid } catch { return null }
}

export async function GET(req: NextRequest) {
  const uid = await getUid(req)
  if (!uid) return new Response('Unauthorized', { status: 401 })
  const url = new URL(req.url)
  const { tenantId, planId: planIdQ, date } = Q.parse({ tenantId: url.searchParams.get('tenantId'), planId: url.searchParams.get('planId') ?? undefined, date: url.searchParams.get('date') ?? undefined })
  let planId = planIdQ
  if (!planId) {
    const tSnap = await adminDb.doc(`tenants/${tenantId}`).get()
    planId = (tSnap.data() as any)?.activePlanId || 'baseline'
  }
  const planSnap = await adminDb.doc(`tenants/${tenantId}/budget_plans/${planId}`).get()
  if (!planSnap.exists) return new Response('plan not found', { status: 404 })
  const plan = planSnap.data() as any
  const key = periodKeyFor((date ?? new Date().toISOString().slice(0,10)), plan.periodConfig, plan.tz)
  const p = await adminDb.doc(`tenants/${tenantId}/budget_plans/${planId}/periods/${key}`).get()
  if (!p.exists) return new Response('period not computed', { status: 404 })
  return Response.json({ periodKey: key, ...(p.data() as any) })
}
