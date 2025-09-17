import { adminDb } from '@/lib/admin'

export type CatRule = {
  id: string
  merchantPattern: string // JS regex string, e.g. "market|grocery"
  envId: string
  pct?: number // default 100
}

export async function loadRules(tenantId: string): Promise<CatRule[]> {
  const snap = await adminDb.collection(`tenants/${tenantId}/categorizer_rules`).get()
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

export function inferSplits(rules: CatRule[], merchant: string, amountCents: number) {
  // For expenses (negative amounts), split positive cents across envelopes
  const abs = Math.abs(amountCents)
  const matches = rules.filter(r => new RegExp(r.merchantPattern, 'i').test(merchant))
  if (!matches.length) return { splits: [], ruleHit: null }

  const ruleHit = matches[0]; // Assuming single rule hit for now for simplicity
  const totalPct = matches.reduce((a, r) => a + (r.pct ?? 100), 0)
  const out: Array<{ envId: string; amountCents: number }> = []
  let allocated = 0
  for (let i = 0; i < matches.length; i++) {
    const r = matches[i]
    const share = i === matches.length - 1
      ? abs - allocated
      : Math.floor((abs * (r.pct ?? 100)) / totalPct)
    allocated += share
    out.push({ envId: r.envId, amountCents: share })
  }
  return { splits: out, ruleHit }
}
