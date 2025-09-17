
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { adminDb, adminAuth } from '@/lib/admin'

const Split = z.object({ envId: z.string(), pct: z.number().int().min(0).max(100) })
const Body = z.object({
  tenantId: z.string().default('dev'),
  active: z.boolean().optional(),
  merchantPattern: z.string().min(1).optional(),
  splits: z.array(Split).refine(a => a.reduce((s, x) => s + x.pct, 0) === 100, 'splits pct must sum to 100').optional(),
})

async function requireUid(req: NextRequest){
  const bypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1' && req.headers.get('x-dev-auth-uid');
  if (bypass) return String(bypass);
  const authz = req.headers.get('authorization') || '';
  if (!authz.startsWith('Bearer ')) return null;
  try { const tok = await adminAuth.verifyIdToken(authz.slice(7)); return tok.uid } catch { return null }
}

export async function GET(req: NextRequest, { params }: { params: { id: string }}) {
  const uid = await requireUid(req);
  if (!uid) return new Response('unauthorized', { status: 401 });
  
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId') || 'dev'
  const snap = await adminDb.doc(`tenants/${tenantId}/categorizer_rules/${params.id}`).get()
  if (!snap.exists) return new Response('not found', { status: 404 })
  const rule = { id: snap.id, ...snap.data() };
  return Response.json({ rule });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string }}){
  const uid = await requireUid(req);
  if (!uid) return new Response('unauthorized', { status: 401 });

  const { tenantId, active, merchantPattern, splits } = Body.parse(await req.json())
  const ref = adminDb.doc(`tenants/${tenantId}/categorizer_rules/${params.id}`)
  const patch: any = { updatedAt: Date.now() }
  if (typeof active === 'boolean') patch.active = active
  if (merchantPattern) patch.merchantPattern = merchantPattern
  if (splits) patch.splits = splits
  if (Object.keys(patch).length > 1) await ref.set(patch, { merge: true })
  const doc = await ref.get()
  return Response.json({ ok: true, rule: { id: doc.id, ...doc.data() } })
}

export async function POST() { return new Response('Method Not Allowed', { status: 405 }) }
export async function PUT() { return new Response('Method Not Allowed', { status: 405 }) }
export async function DELETE() { return new Response('Method Not Allowed', { status: 405 }) }
