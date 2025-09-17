import { NextRequest } from 'next/server'
import { z } from 'zod'
import { adminDb, adminAuth } from '@/lib/admin'

const Rule = z.object({
  id: z.string().min(1).optional(),
  merchantPattern: z.string().min(1),
  envId: z.string().min(1),
  pct: z.number().int().min(1).max(100).optional().default(100),
})

function devUid(req: NextRequest){
  const bypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1' && req.headers.get('x-dev-auth-uid')
  return bypass ? String(bypass) : null
}

async function requireUid(req: NextRequest){
  const d = devUid(req)
  if (d) return d
  const authz = req.headers.get('authorization') || ''
  if (!authz.startsWith('Bearer ')) return null
  try { const tok = await adminAuth.verifyIdToken(authz.slice(7)); return tok.uid } catch { return null }
}

export async function GET(req: NextRequest){
  const uid = await requireUid(req)
  if (!uid) return new Response('unauthorized', { status: 401 })
  const url = new URL(req.url)
  const tenantId = url.searchParams.get('tenantId') || 'dev'
  const snap = await adminDb.collection(`tenants/${tenantId}/categorizer_rules`).get()
  const rules = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
  return Response.json({ rules })
}

export async function POST(req: NextRequest){
  const uid = await requireUid(req)
  if (!uid) return new Response('unauthorized', { status: 401 })
  const body = await req.json()
  const url = new URL(req.url)
  const tenantId = url.searchParams.get('tenantId') || 'dev'
  const parsed = Rule.parse(body)
  const id = parsed.id || parsed.merchantPattern.replace(/[^a-z0-9]+/gi,'_').toLowerCase().slice(0,40) || crypto.randomUUID()
  await adminDb.doc(`tenants/${tenantId}/categorizer_rules/${id}`).set({
    merchantPattern: parsed.merchantPattern,
    envId: parsed.envId,
    pct: parsed.pct ?? 100,
    updatedAt: Date.now(),
  }, { merge: true })
  return Response.json({ ok: true, id })
}

export async function DELETE(req: NextRequest){
  const uid = await requireUid(req)
  if (!uid) return new Response('unauthorized', { status: 401 })
  const url = new URL(req.url)
  const tenantId = url.searchParams.get('tenantId') || 'dev'
  const id = url.searchParams.get('id')
  if (!id) return new Response('missing id', { status: 400 })
  await adminDb.doc(`tenants/${tenantId}/categorizer_rules/${id}`).delete()
  return Response.json({ ok: true })
}
