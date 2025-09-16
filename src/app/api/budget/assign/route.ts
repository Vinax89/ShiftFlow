import { NextRequest } from 'next/server'
import { z } from 'zod'
import { adminAuth, adminDb } from '@/lib/admin'

const Body = z.object({ tenantId: z.string(), planId: z.string(), periodKey: z.string(), envId: z.string(), deltaCents: z.number().int() })

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
  const { tenantId, planId, periodKey, envId, deltaCents } = Body.parse(await req.json())
  const pRef = adminDb.doc(`tenants/${tenantId}/budget_plans/${planId}/periods/${periodKey}`)
  const snap = await pRef.get()
  if (!snap.exists) return new Response('period not found', { status: 404 })
  const data = snap.data() as any
  const row = (data.envelopes as any[]).find(e => e.envId === envId)
  if (!row) return new Response('envelope not in period', { status: 404 })
  row.actualCents = Math.max(0, (row.actualCents ?? 0) + deltaCents)
  row.remainingCents = row.plannedCents + row.carryInCents - row.actualCents
  row.deficitCents = Math.max(row.actualCents - row.plannedCents - row.carryInCents, 0)
  await pRef.update({ envelopes: data.envelopes, updatedAt: Date.now() })
  await adminDb.collection(`tenants/${tenantId}/budget_ledger`).add({ type: 'assign', periodKey, envId, deltaCents, createdAt: Date.now() })
  return Response.json({ ok: true })
}
