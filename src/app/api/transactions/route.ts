import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth as clientAuth } from '@/lib/firebase'
import { addDoc, getDocs, orderBy, query, where } from 'firebase/firestore'
import { tenants } from '@/lib/db/refs'

const CreateTxn = z.object({ tenantId: z.string(), accountId: z.string(), amountCents: z.number().int(), date: z.string().datetime(), merchant: z.string().optional(), memo: z.string().optional(), categoryId: z.string().nullable().optional(), status: z.enum(['posted','pending']).default('posted'), source: z.enum(['manual','csv','api']).default('manual'), hash: z.string() })

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const tenantId = url.searchParams.get('tenantId')
  const accountId = url.searchParams.get('accountId')
  if (!tenantId) return new Response('tenantId required', { status: 400 })
  if (!clientAuth.currentUser) return new Response('Unauthorized', { status: 401 })
  const q = accountId
    ? query(tenants.txns(tenantId), where('accountId','==',accountId), orderBy('date','desc'))
    : query(tenants.txns(tenantId), orderBy('date','desc'))
  const snap = await getDocs(q)
  return Response.json(snap.docs.map(d => ({ id: d.id, ...d.data() })))
}

export async function POST(req: NextRequest) {
  if (!clientAuth.currentUser) return new Response('Unauthorized', { status: 401 })
  const body = CreateTxn.parse(await req.json())
  await addDoc(tenants.txns(body.tenantId), { ...body, currency: 'USD', date: Date.parse(body.date) })
  return new Response(null, { status: 201 })
}
