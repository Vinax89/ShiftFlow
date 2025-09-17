
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { adminDb, adminAuth } from '@/lib/admin'

const Body = z.object({
  tenantId: z.string().default('dev'),
  days: z.number().int().min(1).max(90).default(30),
  merchantPattern: z.string().optional(), // if set, filter rules to this single regex id or pattern
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

async function loadRules(tenantId: string){
  const snap = await adminDb.collection(`tenants/${tenantId}/categorizer_rules`).get()
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Array<{id:string, merchantPattern:string, envId:string, pct?:number}>
}

function inferSplits(rules: Array<{merchantPattern:string, envId:string, pct?:number}>, merchant: string, amountCents: number){
  const abs = Math.abs(amountCents)
  const m = rules.filter(r => new RegExp(r.merchantPattern, 'i').test(merchant || ''))
  if (!m.length) return [] as Array<{envId:string, amountCents:number}>
  const total = m.reduce((a,r)=>a+(r.pct??100),0) || 100
  const out: Array<{envId:string, amountCents:number}> = []
  let alloc = 0
  for (let i=0;i<m.length;i++){
    const r = m[i]
    const pct = Math.max(1, Math.min(100, r.pct ?? 100))
    const share = i===m.length-1 ? abs-alloc : Math.floor(abs * pct / total)
    alloc += share
    out.push({ envId: r.envId, amountCents: share })
  }
  return out
}

export async function POST(req: NextRequest){
  const uid = await requireUid(req)
  if (!uid) return new Response('unauthorized', { status: 401 })
  const { tenantId, days, merchantPattern } = Body.parse(await req.json())

  const since = Date.now() - days*24*60*60*1000
  let rules = await loadRules(tenantId)
  if (merchantPattern){
    rules = rules.filter(r => r.id === merchantPattern || r.merchantPattern === merchantPattern)
  }
  if (!rules.length) return Response.json({ updated: 0, recomputed: 0, dates: [] })

  // fetch recent transactions; Firestore single-field index is enough for orderBy('date','desc')
  const txSnap = await adminDb.collection(`tenants/${tenantId}/transactions`).where('date','>=', since).orderBy('date','desc').limit(500).get()
  const batch = adminDb.batch()
  const dates = new Set<string>()
  let updated = 0

  for (const d of txSnap.docs){
    const tx: any = d.data()
    const merchant = String(tx.merchant || '')
    const amount = Number(tx.amountCents || 0)
    if (!merchant || amount === 0) continue
    const splits = inferSplits(rules, merchant, amount)
    if (!splits.length) continue

    const idxRef = adminDb.doc(`tenants/${tenantId}/budget_tx_index/${d.id}`)
    const idx = await idxRef.get()
    if (idx.exists) continue // do not clobber manual/rule choices

    batch.set(idxRef, { splits, source: 'apply_now', updatedAt: Date.now() }, { merge: true })
    updated++
    // derive YYYY-MM-DD for recompute date bucket
    const dt = tx.date && tx.date.toDate ? tx.date.toDate() : (typeof tx.date==='number' ? new Date(tx.date) : new Date())
    const ymd = isNaN(+dt) ? new Date().toISOString().slice(0,10) : dt.toISOString().slice(0,10)
    dates.add(ymd)
  }

  if (updated) await batch.commit()

  // coalesced recompute via same-host call (API already has a lock)
  const proto = process.env.INTERNAL_PROTO || 'http'
  const host = process.env.INTERNAL_HOST || 'localhost:9010'
  const origin = `${proto}://${host}`
  let recomputed = 0
  if (updated) {
    const resp = await fetch(`${origin}/api/budget/recompute`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-auth-uid': 'dev-user' },
      body: JSON.stringify({ tenantId, dates: Array.from(dates) })
    })
    if (resp.ok) recomputed = (await resp.json()).results?.length ?? 0
  }

  return Response.json({ updated, recomputed, dates: Array.from(dates).sort() })
}
