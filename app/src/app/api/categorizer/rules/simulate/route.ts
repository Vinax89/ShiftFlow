import { NextRequest } from 'next/server'
import { z } from 'zod'
import { adminDb } from '@/lib/admin'

const Split = z.object({ envId: z.string(), pct: z.number().int().min(0).max(100) })
const Body = z.object({
  tenantId: z.string().default('dev'),
  merchantPattern: z.string().min(1),
  splits: z.array(Split).refine(a => a.reduce((s,x)=>s+x.pct,0)===100, 'splits pct must sum to 100'),
  limit: z.number().int().min(1).max(500).default(100),
})

export async function POST(req: NextRequest){
  const { tenantId, merchantPattern, splits, limit } = Body.parse(await req.json())
  // pull latest N transactions
  const txSnap = await adminDb.collection(`tenants/${tenantId}/transactions`).orderBy('date','desc').limit(limit).get()
  const re = new RegExp(merchantPattern, 'i')
  const sample: any[] = []
  let hits = 0
  for (const d of txSnap.docs){
    const t = d.data() as any
    const m = String(t.merchant||'')
    if (!re.test(m)) continue
    hits++
    const amount = Number(t.amountCents ?? 0)
    let acc = 0
    const applied = splits.map((s, i) => {
      if (i === splits.length - 1) return { envId: s.envId, pct: s.pct, amountCents: amount - acc }
      const a = Math.round(amount * s.pct / 100)
      acc += a
      return { envId: s.envId, pct: s.pct, amountCents: a }
    })
    if (sample.length < 20) {
      const dt = new Date(t.date?.seconds ? t.date.seconds*1000 : t.date || Date.now());
      const dateStr = isNaN(dt.valueOf()) ? new Date().toISOString().slice(0, 10) : dt.toISOString().slice(0, 10);
      sample.push({
        txId: d.id,
        date: dateStr,
        merchant: m,
        amountCents: amount,
        splits: applied,
        why: { regex: merchantPattern, flags: 'i', groups: [] },
      });
    }
  }
  return Response.json({ hits, sample })
}
