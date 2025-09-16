import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth as clientAuth } from '@/lib/firebase'
import { getFirestore, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore'
import { tenants } from '@/lib/db/refs'

const CreateBody = z.object({ tenantId: z.string(), name: z.string().min(1), type: z.enum(['checking','savings','cash','card']), mask: z.string().min(2).max(6) })

export async function GET(req: NextRequest) {
  const tenantId = new URL(req.url).searchParams.get('tenantId')
  if (!tenantId) return new Response('tenantId required', { status: 400 })
  if (!clientAuth.currentUser) return new Response('Unauthorized', { status: 401 })
  const snap = await getDocs(query(tenants.accounts(tenantId), orderBy('createdAt','desc')))
  return Response.json(snap.docs.map(d => ({ id: d.id, ...d.data() })))
}

export async function POST(req: NextRequest) {
  if (!clientAuth.currentUser) return new Response('Unauthorized', { status: 401 })
  const body = CreateBody.parse(await req.json())
  await addDoc(tenants.accounts(body.tenantId), { ...body, createdAt: Date.now(), updatedAt: Date.now() })
  return new Response(null, { status: 201 })
}
