import { adminDb } from '@/lib/admin'

export type CatRule = {
  id: string
  merchantPattern: string // JS regex string, e.g. "market|grocery"
  active?: boolean;
  splits?: Array<{ envId: string; pct: number }>;
  envId: string
  pct?: number // default 100
}

export async function loadRules(tenantId: string): Promise<CatRule[]> {
  const snap = await adminDb.collection(`tenants/${tenantId}/categorizer_rules`).get()
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
}

export function inferSplits(rules: CatRule[], merchant: string, amountCents: number): { splits: Array<{ envId: string; amountCents: number }>, ruleHit: CatRule | null } {
  // For expenses (negative amounts), split positive cents across envelopes
  const abs = Math.abs(amountCents)
  const matches = rules.filter(r => new RegExp(r.merchantPattern, 'i').test(merchant))
  if (!matches.length) return { splits: [], ruleHit: null }

  const ruleHit = matches[0]; // Assuming single rule hit for now for simplicity
  const splitsDef = ruleHit.splits && ruleHit.splits.length > 0 ? ruleHit.splits : [{ envId: ruleHit.envId, pct: ruleHit.pct ?? 100 }]
  const totalPct = splitsDef.reduce((a, r) => a + (r.pct ?? 100), 0)
  const out: Array<{ envId: string; amountCents: number }> = []
  let allocated = 0
  for (let i = 0; i < splitsDef.length; i++) {
    const r = splitsDef[i]
    const share = i === splitsDef.length - 1
      ? abs - allocated
      : Math.floor((abs * (r.pct ?? 100)) / totalPct)
    allocated += share
    out.push({ envId: r.envId, amountCents: share })
  }
  return { splits: out, ruleHit }
}
