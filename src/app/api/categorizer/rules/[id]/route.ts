import { NextRequest } from 'next/server'
import { z } from 'zod'
import { adminDb } from '@/lib/admin'

const Split = z.object({ envId: z.string(), pct: z.number().int().min(0).max(100) })
const Body = z.object({
  tenantId: z.string().default('dev'),
  active: z.boolean().optional(),
  merchantPattern: z.string().min(1).optional(),
  splits: z.array(Split).refine(a => a.reduce((s, x) => s + x.pct, 0) === 100, 'splits pct must sum to 100').optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string }}) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId') || 'dev'
  const snap = await adminDb.doc(`tenants/${tenantId}/categorizer_rules/${params.id}`).get()
  if (!snap.exists) return new Response('not found', { status: 404 })
  return Response.json({ id: snap.id, ...snap.data() })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string }}){
  const { tenantId, active, merchantPattern, splits } = Body.parse(await req.json())
  const ref = adminDb.doc(`tenants/${tenantId}/categorizer_rules/${params.id}`)
  const patch: any = {}
  if (typeof active === 'boolean') patch.active = active
  if (merchantPattern) patch.merchantPattern = merchantPattern
  if (splits) patch.splits = splits
  if (Object.keys(patch).length) await ref.set(patch, { merge: true })
  const doc = await ref.get()
  return Response.json({ ok: true, rule: { id: doc.id, ...doc.data() } })
}
