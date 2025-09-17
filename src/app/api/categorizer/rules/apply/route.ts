
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { adminDb, adminAuth } from '@/lib/admin'

const Split = z.object({ envId: z.string(), pct: z.number().int().min(0).max(100) })
const Body = z.object({
  tenantId: z.string().default('dev'),
  // Either ruleId OR inline rule fields
  ruleId: z.string().optional(),
  merchantPattern: z.string().min(1).optional(),
  splits: z.array(Split).optional(), // pct must sum to 100 when present
  // Selection window
  limit: z.number().int().min(1).max(2000).default(500),
  since: z.string().optional(), // ISO date (inclusive)
  until: z.string().optional(), // ISO date (inclusive)
  accountId: z.string().optional(),
  dryRun: z.boolean().default(false),
  triggerRecompute: z.boolean().default(false),
}).refine((v)=> !!v.ruleId || (!!v.merchantPattern && !!v.splits), {
  message: 'Provide ruleId or inline { merchantPattern, splits }'
}).refine((v)=> !v.splits || v.splits.reduce((s,x)=>s+x.pct,0)===100, {
  message: 'splits pct must sum to 100'
})

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

  const { tenantId, ruleId, merchantPattern, splits, limit, since, until, accountId, dryRun, triggerRecompute } = Body.parse(await req.json())

  let rule: { id:string, merchantPattern:string, splits: Array<{envId:string,pct:number}>, active?:boolean } | null = null
  if (ruleId){
    const snap = await adminDb.doc(`tenants/${tenantId}/categorizer_rules/${ruleId}`).get()
    if (!snap.exists) return new Response('rule not found', { status: 404 })
    const d = snap.data() as any
    rule = { id: snap.id, merchantPattern: d.merchantPattern, splits: d.splits||[], active: d.active }
  } else {
    rule = { id: 'inline', merchantPattern: merchantPattern!, splits: splits!, active: true }
  }
  if (rule?.active === false) return new Response('rule inactive', { status: 409 })

  // Select candidate txns
  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDb.collection(`tenants/${tenantId}/transactions`).orderBy('date','desc')
  if (accountId) query = query.where('accountId','==',accountId)
  const qSnap = await query.limit(limit).get()
  const re = new RegExp(rule!.merchantPattern, 'i')

  type Applied = { txId:string, prev?: any, next: any, dateISO:string, merchant: string, amountCents: number }
  const applied: Applied[] = []

  for (const d of qSnap.docs){
    const t = d.data() as any
    const merchant = String(t.merchant || '')
    
    const dt = new Date(t.date?.seconds ? t.date.seconds * 1000 : t.date || Date.now())
    const dateISO = isNaN(dt.valueOf()) ? new Date().toISOString().slice(0, 10) : dt.toISOString().slice(0, 10)
    
    if (since && dateISO < since) continue
    if (until && dateISO > until) continue
    if (!re.test(merchant)) continue

    const amount = Number(t.amountCents ?? 0)
    let acc = 0
    const nextSplits = rule!.splits.map((s, i) => {
      if (i === rule!.splits.length - 1) return { envId: s.envId, amountCents: amount - acc }
      const a = Math.round(amount * s.pct / 100)
      acc += a
      return { envId: s.envId, amountCents: a }
    })

    const idxRef = adminDb.doc(`tenants/${tenantId}/budget_tx_index/${d.id}`)
    const prevSnap = await idxRef.get()
    const prev = prevSnap.exists ? prevSnap.data() : undefined

    if (!dryRun){
      await idxRef.set({ splits: nextSplits, source: 'rule', ruleId: rule!.id, updatedAt: Date.now() }, { merge: true })
    }

    applied.push({ txId: d.id, prev, next: { splits: nextSplits, source: 'rule', ruleId: rule!.id }, dateISO, merchant, amountCents: amount })
  }

  // Ledger for undo
  let ledgerId: string | undefined
  if (!dryRun){
    const ledRef = adminDb.collection(`tenants/${tenantId}/categorizer_ledger`).doc()
    await ledRef.set({ type:'apply', ruleId: rule!.id, merchantPattern: rule!.merchantPattern, splits: rule!.splits, count: applied.length, items: applied.map(a=>({txId:a.txId, prev:a.prev, next:a.next})), createdAt: Date.now() })
    ledgerId = ledRef.id
  }

  // Trigger recompute for affected dates, if any
  const uniqueDates = Array.from(new Set(applied.map(a=>a.dateISO))).slice(0,60)
  if (!dryRun && triggerRecompute && uniqueDates.length){
    try {
      const devUid = req.headers.get('x-dev-auth-uid');
      const origin = new URL(req.url).origin
      await fetch(`${origin}/api/budget/recompute`, {
        method:'POST',
        headers: { 'content-type': 'application/json', ...(devUid ? { 'x-dev-auth-uid': devUid } : {}) },
        body: JSON.stringify({ tenantId, dates: uniqueDates })
      })
    } catch {}
  }

  if (dryRun) {
    const sample = applied.slice(0, 20).map(a=>({ txId:a.txId, merchant:a.merchant, amountCents:a.amountCents, prev:a.prev, next:a.next }))
    return Response.json({ ok:true, dryRun:true, rule, count: applied.length, sample, dates: Array.from(new Set(applied.map(a=>a.dateISO))), scope: { since, until, accountId } })
  }
  return Response.json({ ok:true, rule, count: applied.length, ledgerId, dates: Array.from(new Set(applied.map(a=>a.dateISO))), scope: { since, until, accountId } })
}

export async function GET() { return new Response('Method Not Allowed', { status: 405 }) }
export async function PUT() { return new Response('Method Not Allowed', { status: 405 }) }
export async function DELETE() { return new Response('Method Not Allowed', { status: 405 }) }
export async function PATCH() { return new Response('Method Not Allowed', { status: 405 }) }
