
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { adminDb, adminAuth } from '@/lib/admin'

const Body = z.object({ tenantId: z.string().default('dev'), ledgerId: z.string().optional() })

async function requireUid(req: NextRequest){
  const bypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1' && req.headers.get('x-dev-auth-uid');
  if (bypass) return String(bypass);
  const authz = req.headers.get('authorization') || '';
  if (!authz.startsWith('Bearer ')) return null;
  try { const tok = await adminAuth.verifyIdToken(authz.slice(7)); return tok.uid } catch { return null }
}


export async function POST(req: NextRequest){
  const uid = await requireUid(req);
  if (!uid) return new Response('unauthorized', { status: 401 });
  
  const { tenantId, ledgerId } = Body.parse(await req.json())
  let ledDoc
  if (ledgerId){
    ledDoc = await adminDb.doc(`tenants/${tenantId}/categorizer_ledger/${ledgerId}`).get()
  } else {
    const q = await adminDb.collection(`tenants/${tenantId}/categorizer_ledger`).where('type','==','apply').orderBy('createdAt','desc').limit(1).get()
    ledDoc = q.docs[0]
  }
  if (!ledDoc || !ledDoc.exists) return new Response('no apply to undo', { status: 404 })
  const data = ledDoc.data() as any
  const items: Array<{txId:string, prev:any}> = data.items || []

  for (const it of items){
    const ref = adminDb.doc(`tenants/${tenantId}/budget_tx_index/${it.txId}`)
    if (!it.prev) {
      // remove index overlay
      await ref.delete().catch(()=>{})
    } else {
      await ref.set(it.prev, { merge: false })
    }
  }

  await ledDoc.ref.set({ undoneAt: Date.now() }, { merge: true })

  return Response.json({ ok:true, undone: items.length })
}
