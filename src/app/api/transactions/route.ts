import { NextRequest } from 'next/server'
import { z } from 'zod'
import { adminAuth, adminDb } from '@/lib/admin'

const CreateTxn = z.object({ tenantId: z.string(), accountId: z.string(), amountCents: z.number().int(), date: z.string().datetime(), merchant: z.string().optional(), memo: z.string().optional(), categoryId: z.string().nullable().optional(), status: z.enum(['posted','pending']).default('posted'), source: z.enum(['manual','csv','api']).default('manual'), hash: z.string() })

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
  const accountId = url.searchParams.get('accountId')
  let ref = adminDb.collection(`tenants/${tenantId}/transactions`)
  const q = accountId ? ref.where('accountId', '==', accountId).orderBy('date','desc') : ref.orderBy('date','desc')
  const snap = await q.get()
  return Response.json(snap.docs.map(d => ({ id: d.id, ...d.data() })))
}

export async function POST(req: NextRequest) {
  const uid = await getUid(req)
  if (!uid) return new Response('Unauthorized', { status: 401 })
  const body = CreateTxn.parse(await req.json())
  await adminDb.collection(`tenants/${body.tenantId}/transactions`).add({ ...body, currency: 'USD', date: Date.parse(body.date) })
  return new Response(null, { status: 201 })
}