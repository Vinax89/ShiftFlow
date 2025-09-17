import { NextRequest } from 'next/server'
import { adminDb } from '@/lib/admin'

export async function GET(req: NextRequest){
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId') || 'dev'

  // Try: tenants/{t}/budget_plans (active one), else fallback to latest period cache
  const plans = await adminDb.collection(`tenants/${tenantId}/budget_plans`).where('active','==', true).limit(1).get().catch(()=>null)
  let envs: Array<{ id:string; name:string }> = []
  if (plans && !plans.empty){
    const planId = plans.docs[0].id
    const envSnap = await adminDb.collection(`tenants/${tenantId}/budget_plans/${planId}/envelopes`).get()
    envs = envSnap.docs.map(d=>({ id: d.id, name: (d.data() as any).name || d.id }))
  }
  return Response.json({ envelopes: envs })
}
