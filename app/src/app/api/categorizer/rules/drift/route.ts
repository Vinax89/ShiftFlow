

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { adminDb, adminAuth } from '@/lib/admin'

const Body = z.object({ tenantId: z.string().default('dev'), ruleId: z.string(), lookbackDays: z.number().int().min(1).max(120).default(30) })

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

  const { tenantId, ruleId, lookbackDays } = Body.parse(await req.json())
  const ruleDoc = await adminDb.doc(`tenants/${tenantId}/categorizer_rules/${ruleId}`).get()
  if (!ruleDoc.exists) return new Response('rule not found', { status: 404 })
  const rule: any = ruleDoc.data()
  const re = new RegExp(String(rule.merchantPattern||'.*'), 'i')

  const sinceMs = Date.now() - lookbackDays*24*3600*1000
  const txSnap = await adminDb.collection(`tenants/${tenantId}/transactions`).orderBy('date','desc').limit(2000).get()

  let matched=0, applied=0, overrides=0
  const samples:any[] = []

  for (const d of txSnap.docs){
    const t:any = d.data()
    const ts = t.date?.seconds ? t.date.seconds*1000 : (t.date||Date.now())
    if (ts < sinceMs) break
    const merchant = String(t.merchant||'')
    if (!re.test(merchant)) continue
    matched++
    const idx = await adminDb.doc(`tenants/${tenantId}/budget_tx_index/${d.id}`).get()
    if (idx.exists){
      const i:any = idx.data()
      if (i.source === 'rule' && i.ruleId === ruleId) applied++
      // treat any `manual` with different splits as an override
      if (i.source === 'manual') {
        overrides++
        if (samples.length < 10) samples.push({ txId: d.id, merchant, amountCents: t.amountCents, splits: i.splits })
      }
    }
  }

  const accuracy = matched > 0 ? Math.max(0, (applied - overrides)) / matched : 0
  const status = matched > 0 && overrides/matched > 0.2 ? 'drifting' : 'healthy'
  const tip = status==='drifting' ? 'Pattern may be too broad; consider tightening with anchors or merchant aliases.' : 'Looking good. Periodically re‑check.'

  return Response.json({ ok:true, matched, applied, overrides, accuracy, status, tip, samples })
}

export async function GET() { return new Response('Method Not Allowed', { status: 405 }) }
export async function PUT() { return new Response('Method Not Allowed', { status: 405 }) }
export async function DELETE() { return new Response('Method Not Allowed', { status: 405 }) }
export async function PATCH() { return new Response('Method Not Allowed', { status: 405 }) }
