import { NextRequest } from 'next/server'
import { z } from 'zod'
import { adminDb } from '@/lib/admin'

const Body = z.object({ tenantId: z.string().default('dev'), active: z.boolean().optional() })

export async function GET(req: NextRequest, { params }: { params: { id: string }}) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId') || 'dev'
  const snap = await adminDb.doc(`tenants/${tenantId}/categorizer_rules/${params.id}`).get()
  if (!snap.exists) return new Response('not found', { status: 404 })
  return Response.json({ id: snap.id, ...snap.data() })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string }}){
  const { tenantId, active } = Body.parse(await req.json())
  const ref = adminDb.doc(`tenants/${tenantId}/categorizer_rules/${params.id}`)
  if (typeof active === 'boolean') await ref.set({ active }, { merge: true })
  const doc = await ref.get()
  return Response.json({ ok: true, rule: { id: doc.id, ...doc.data() } })
}
