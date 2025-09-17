import { NextRequest } from 'next/server'
import { z } from 'zod'
import { adminAuth, adminDb } from '@/lib/admin'

const Body = z.object({
  tenantId: z.string(),
  accountId: z.string().default('acct-seed'),
  amountCents: z.number().int(),
  currency: z.string().default('USD'),
  dateISO: z.string(),
  merchant: z.string().default('Unknown'),
  memo: z.string().optional(),
  splits: z.array(z.object({ envId: z.string(), amountCents: z.number().int() })).optional()
})

async function getUid(req: NextRequest): Promise<string|null> {
  const bypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1' && req.headers.get('x-dev-auth-uid')
  if (bypass) return String(bypass)
  const authz = req.headers.get('authorization') || ''
  if (!authz.startsWith('Bearer ')) return null
  try { const d = await adminAuth.verifyIdToken(authz.slice(7)); return d.uid } catch { return null }
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
  const { tenantId, accountId, amountCents, currency, dateISO, merchant, memo, splits } = Body.parse(await req.json())

  const txRef = await adminDb.collection(`tenants/${tenantId}/transactions`).add({
    accountId, amountCents, currency, date: new Date(dateISO).getTime(), merchant, memo: memo || '', status: 'posted', source: 'manual', createdAt: Date.now()
  })
  if (splits && splits.length) {
    await adminDb.doc(`tenants/${tenantId}/budget_tx_index/${txRef.id}`).set({ splits, source: 'manual', updatedAt: Date.now() })
  }
  // Kick a recompute for the transaction date (assumes planId 'baseline' for MVP)
  const headers: HeadersInit = { 'content-type': 'application/json' }
  if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1') headers['x-dev-auth-uid'] = 'dev-user'
  const url = new URL('/api/budget/recompute', req.nextUrl.origin)
  await fetch(url, { method: 'POST', headers, body: JSON.stringify({ tenantId, dates: [dateISO] }) })
  return Response.json({ ok: true, txId: txRef.id })
}
