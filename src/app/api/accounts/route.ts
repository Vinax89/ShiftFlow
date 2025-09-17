import { NextRequest } from 'next/server'
import { z } from 'zod'
import { adminAuth, adminDb } from '@/lib/admin'

const CreateBody = z.object({ tenantId: z.string(), name: z.string().min(1), type: z.enum(['checking','savings','cash','card']), mask: z.string().min(2).max(6) })

async function getUid(req: NextRequest): Promise<string|null> {
  const bypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1' && req.headers.get('x-dev-auth-uid')
  if (bypass) return String(bypass)
  const authz = req.headers.get('authorization') || ''
  if (!authz.startsWith('Bearer ')) return null
  const token = authz.slice(7)
  try { const d = await adminAuth.verifyIdToken(token); return d.uid } catch { return null }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const tenantId = url.searchParams.get('tenantId')
  if (!tenantId) return new Response('tenantId required', { status: 400 })
  const uid = await getUid(req)
  if (!uid) return new Response('Unauthorized', { status: 401 })
  // Optional: enforce membership unless bypass was used
  const bypass = req.headers.get('x-dev-auth-uid') && process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1'
  if (!bypass) {
    const u = await adminDb.doc(`users/${uid}`).get()
    if (!u.exists || !(u.get('tenants')||{})[tenantId]) return new Response('Forbidden', { status: 403 })
  }
  const snap = await adminDb.collection(`tenants/${tenantId}/accounts`).orderBy('createdAt','desc').get()
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return Response.json({ items });
}

export async function POST(req: NextRequest) {
  const uid = await getUid(req)
  if (!uid) return new Response('Unauthorized', { status: 401 })
  const body = CreateBody.parse(await req.json())
  await adminDb.collection(`tenants/${body.tenantId}/accounts`).add({ ...body, createdAt: Date.now(), updatedAt: Date.now() })
  return new Response(null, { status: 201 })
}
