
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { adminDb, adminAuth } from '@/lib/admin'
import { inferSplits } from '@/lib/categorizer/rules'
import type { CatRule } from '@/lib/categorizer/rules'

const Body = z.object({
  tenantId: z.string().default('dev'),
  days: z.number().int().min(1).max(90).default(30),
  merchantPattern: z.string().optional(), // if set, filter rules to this single regex id or pattern
  dryRun: z.boolean().optional().default(false),
  previewLimit: z.number().int().min(1).max(200).default(50),
  // NEW: apply a subset only
  onlyTxIds: z.array(z.string()).optional(),
  // NEW: additional merchant filters (regex strings, case-insensitive)
  includeMerchants: z.array(z.string()).optional(),
  excludeMerchants: z.array(z.string()).optional(),
})

async function requireUid(req: NextRequest){
  const bypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1' && req.headers.get('x-dev-auth-uid');
  if (bypass) return String(bypass);
  const authz = req.headers.get('authorization') || '';
  if (!authz.startsWith('Bearer ')) return null;
  try { const tok = await adminAuth.verifyIdToken(authz.slice(7)); return tok.uid } catch { return null }
}

async function loadRules(tenantId: string): Promise<CatRule[]> {
  const snap = await adminDb.collection(`tenants/${tenantId}/categorizer_rules`).get()
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

export async function POST(req: NextRequest){
  const uid = await requireUid(req)
  if (!uid) return new Response('unauthorized', { status: 401 })
  const { tenantId, days, merchantPattern, dryRun, previewLimit, onlyTxIds, includeMerchants, excludeMerchants } = Body.parse(await req.json())

  const since = Date.now() - days*24*60*60*1000
  let rules = await loadRules(tenantId)
  // NEW: respect rule activation
  rules = rules.filter(r => r.active !== false)
  if (merchantPattern){
    rules = rules.filter(r => r.id === merchantPattern || r.merchantPattern === merchantPattern)
  }
  if (!rules.length) return Response.json({ updated: 0, recomputed: 0, dates: [] })

  // fetch target transactions
  const txDocs: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>[] = []
  if (onlyTxIds && onlyTxIds.length){
    for (const id of onlyTxIds){
      const d = await adminDb.doc(`tenants/${tenantId}/transactions/${id}`).get()
      if (d.exists) txDocs.push(d as any)
    }
  } else {
    const txSnap = await adminDb
      .collection(`tenants/${tenantId}/transactions`)
      .where('date','>=', new Date(since))
      .orderBy('date','desc')
      .limit(500)
      .get()
    txDocs.push(...txSnap.docs as any)
  }

  const batch = adminDb.batch()
  const dates = new Set<string>()
  let updated = 0
  const preview: Array<{
    txId:string,
    date:string,
    merchant:string,
    amountCents:number,
    splits:Array<{envId:string,amountCents:number}>,
    matchReason: { type:'rule'; ruleId:string; pattern:string; active?: boolean } | { type:'none' },
    // NEW: explain why
    why?: {
      regex: string
      flags: string
      groups: string[]
      splits: Array<{ envId:string; pct:number; amountCents:number }>
    }
  }>=[]

  // compile merchant regex filters once
  const incRe = (includeMerchants||[]).map(p=>{ try { return new RegExp(p,'i') } catch { return null } }).filter(Boolean) as RegExp[]
  const excRe = (excludeMerchants||[]).map(p=>{ try { return new RegExp(p,'i') } catch { return null } }).filter(Boolean) as RegExp[]

  for (const d of txDocs){
    const tx: any = d.data()
    const merchant = String(tx.merchant || '')
    const amount = Number(tx.amountCents || 0)
    if (!merchant || amount === 0) continue
    // merchant filter gates
    if (incRe.length && !incRe.some(r=>r.test(merchant))) continue
    if (excRe.length && excRe.some(r=>r.test(merchant))) continue
    
    const { splits, ruleHit } = inferSplits(rules, merchant, amount)
    

    const idxRef = adminDb.doc(`tenants/${tenantId}/budget_tx_index/${d.id}`)
    const idx = await idxRef.get()
    if (idx.exists && idx.data()?.source !== 'apply_now') continue // do not clobber manual/rule choices, but allow re-application of `apply_now`

    // derive YYYY-MM-DD for recompute date bucket
    const dt = tx.date && tx.date.toDate ? tx.date.toDate() : (typeof tx.date==='number' ? new Date(tx.date) : new Date())
    const ymd = isNaN(+dt) ? new Date().toISOString().slice(0,10) : dt.toISOString().slice(0,10)
    
    if (!splits.length) continue

    if (dryRun) {
      if (preview.length < previewLimit) preview.push({
        txId: d.id,
        date: ymd,
        merchant,
        amountCents: amount,
        splits,
        matchReason: ruleHit ? { type:'rule', ruleId: ruleHit.id, pattern: ruleHit.merchantPattern, active: ruleHit.active !== false } : { type:'none' },
        why: ruleHit ? (function(){
          let groups: string[] = []
          try { const m = new RegExp(ruleHit.merchantPattern, 'i').exec(merchant); if (m) groups = Array.from(m).slice(1) } catch {}
          // derive split math from ruleHit.splits (pct) if present; fall back to computed splits (amountCents)
          const pctSplits = Array.isArray((ruleHit as any).splits) && (ruleHit as any).splits.length && 'pct' in (ruleHit as any).splits[0]
            ? (ruleHit as any).splits as Array<{ envId:string; pct:number }>
            : null
          const computed = pctSplits
            ? pctSplits.map((s, i) => {
              const remainingAmount = amount - pctSplits!.slice(0,i).reduce((acc,p) => acc + Math.round(amount * p.pct/100),0)
              return { envId: s.envId, pct: s.pct, amountCents: i === pctSplits!.length-1 ? remainingAmount : Math.round(amount * s.pct / 100) }
            })
            : (splits || []).map(s => ({ envId: s.envId, pct: Math.round((s.amountCents/amount)*100), amountCents: s.amountCents }))
          return { regex: ruleHit.merchantPattern, flags: 'i', groups, splits: computed }
        })() : undefined,
      })
    } else {
      batch.set(idxRef, { splits, source: 'apply_now', ruleId: ruleHit?.id, updatedAt: Date.now() }, { merge: true })
      updated++
      dates.add(ymd)
    }
  }

  if (updated && !dryRun) await batch.commit()

  // coalesced recompute via same-host call (API already has a lock)
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  const host = req.headers.get('host') || 'localhost:9010'
  const origin = `${proto}://${host}`
  let recomputed = 0
  if (updated && !dryRun) {
    const devUidHeader = req.headers.get('x-dev-auth-uid')
    const resp = await fetch(`${origin}/api/budget/recompute`, {
      method: 'POST', headers: { 'content-type': 'application/json', ...(devUidHeader ? {'x-dev-auth-uid': devUidHeader} : {}) },
      body: JSON.stringify({ tenantId, dates: Array.from(dates) })
    })
    if (resp.ok) recomputed = (await resp.json()).results?.length ?? 0
  }

  return Response.json({ updated, recomputed, dates: Array.from(dates).sort(), dryRun, preview })
}

export async function GET() { return new Response('Method Not Allowed', { status: 405 }) }
export async function PUT() { return new Response('Method Not Allowed', { status: 405 }) }
export async function DELETE() { return new Response('Method Not Allowed', { status: 405 }) }
export async function PATCH() { return new Response('Method Not Allowed', { status: 405 }) }
