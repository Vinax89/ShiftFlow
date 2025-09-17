import { NextRequest } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/admin";

const Body = z.object({
  tenantId: z.string().min(1),
  merchantPattern: z.string().min(1),
  splits: z.array(z.object({ envId: z.string().min(1), pct: z.number().int().min(0).max(100) })).min(1),
  since: z.string().min(8),
  until: z.string().min(8),
  accountId: z.string().optional().nullable(),
  limit: z.number().int().min(1).max(2000).default(50),
  dryRun: z.boolean().optional().default(true),
  triggerRecompute: z.boolean().optional().default(false),
});

type TxnDoc = { id: string; date: string | { seconds: number }; merchant?: string; accountId?: string };

function toISO(d: TxnDoc["date"]): string {
  if (typeof d === "string") return d.slice(0, 10);
  const iso = new Date(((d as any).seconds ?? 0) * 1000).toISOString();
  return iso.slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const { tenantId, merchantPattern, splits, since, until, accountId, limit, dryRun } = body;

    let re: RegExp;
    try { re = new RegExp(merchantPattern, "i"); } catch { return new Response("invalid regex", { status: 400 }); }

    const col = adminDb.collection(`tenants/${tenantId}/transactions`);
    const qs = await col.orderBy("date", "desc").limit(1000).get();

    const candidates: TxnDoc[] = [];
    for (const doc of qs.docs) {
      const data = doc.data() as any;
      const row: TxnDoc = { id: doc.id, ...data };
      const d = toISO(row.date);
      if (d < since || d > until) continue;
      if (accountId && row.accountId && row.accountId !== accountId) continue;
      if (row.merchant && re.test(row.merchant)) {
        candidates.push({ ...row, date: d });
        if (candidates.length >= limit) break;
      }
    }

    const dates = Array.from(new Set(candidates.map(t => toISO(t.date)))).sort();

    if (dryRun) return Response.json({ matched: candidates.length, modified: 0, dates });

    const batch = adminDb.batch();
    let modified = 0;
    for (const t of candidates) {
      const idxRef = adminDb.doc(`tenants/${tenantId}/budget_tx_index/${t.id}`);
      batch.set(idxRef, { splits, source: "rule", updatedAt: Date.now() }, { merge: true });
      modified++;
    }
    if (modified > 0) await batch.commit();

    return Response.json({ matched: candidates.length, modified, dates });
  } catch (e: any) {
    console.error("/api/categorizer/rules/apply error", e);
    return new Response(e?.message || "error", { status: 500 });
  }
}
