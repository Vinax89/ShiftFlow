
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { adminDb } from '@/lib/admin';

const Body = z.object({
  tenantId: z.string().min(1),
  merchantPattern: z.string().min(1),
  splits: z.array(z.object({
    envId: z.string().min(1),
    pct: z.number().int().min(0).max(100),
  })).min(1),
  since: z.string().min(8),  // ISO date (YYYY-MM-DD)
  until: z.string().min(8),
  accountId: z.string().optional().nullable(),
  limit: z.number().int().min(1).max(2000).default(500),
  dryRun: z.boolean().optional().default(true),
  triggerRecompute: z.boolean().optional().default(false),
})

type TxnDoc = {
  id: string
  date: string | { seconds: number }
  merchant?: string
  accountId?: string
  amountCents?: number
}

function toISODate(d: TxnDoc['date']): string {
  if (typeof d === 'string') return d.slice(0, 10)
  // Firestore Timestamp-like {seconds}
  const iso = new Date((d.seconds ?? 0) * 1000).toISOString()
  return iso.slice(0, 10)
}

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json())
    const {
      tenantId, merchantPattern, splits, since, until,
      accountId, limit, dryRun,
    } = body

    // Compile regex once (safe default: case-insensitive)
    let re: RegExp
    try {
      re = new RegExp(merchantPattern, 'i')
    } catch {
      return new Response('invalid regex', { status: 400 })
    }

    // Build base query by date range (string ISO or Timestamp)
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDb.collection(`tenants/${tenantId}/transactions`)
    
    // We can’t do string range on unknown field types reliably, so fetch a bounded set by server time
    // and filter in memory. Keep it small via 'limit'.
    // If you store dates as string ISO (YYYY-MM-DD), you may add where('date','>=', since).where('date','<=', until).
    let qs = await query.orderBy('date', 'desc').limit(1000).get()

    const candidates: TxnDoc[] = []
    for (const d of qs.docs) {
      const data = d.data() as any
      const row: TxnDoc = { id: d.id, ...data }
      const iso = toISODate(row.date)
      if (iso < since || iso > until) continue
      if (accountId && row.accountId && row.accountId !== accountId) continue
      if (row.merchant && re.test(row.merchant)) {
        candidates.push({ ...row, date: iso })
        if (candidates.length >= limit) break
      }
    }

    const dates = Array.from(new Set(candidates.map(t => toISODate(t.date)))).sort()

    if (dryRun) {
      return Response.json({ matched: candidates.length, modified: 0, dates })
    }

    // Apply: write overlay docs
    const batch = adminDb.batch()
    let modified = 0
    for (const t of candidates) {
      const amount = Number(t.amountCents ?? 0);
      let acc = 0;
      const finalSplits = splits.map((s, i) => {
        if (i === splits.length - 1) {
          return { envId: s.envId, amountCents: amount - acc };
        }
        const a = Math.round(amount * s.pct / 100);
        acc += a;
        return { envId: s.envId, amountCents: a };
      });
      
      const idxRef = adminDb.doc(`tenants/${tenantId}/budget_tx_index/${t.id}`)
      batch.set(idxRef, {
        splits: finalSplits,
        source: 'rule',
        updatedAt: Date.now(),
      }, { merge: true })
      modified++
    }
    if (modified > 0) await batch.commit()

    return Response.json({ matched: candidates.length, modified, dates })
  } catch (e: any) {
    console.error('/api/categorizer/rules/apply error', e)
    return new Response(e?.message || 'error', { status: 500 })
  }
}
