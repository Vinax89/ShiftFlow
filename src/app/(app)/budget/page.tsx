import { Suspense } from 'react'
import { headers as nextHeaders } from 'next/headers'
import { AdjustButtons } from '@/components/budget/AdjustButtons'

function BudgetInner() {
  // dev defaults; replace with user context later
  const tenantId = 'dev'
  const planId = 'baseline'
  const authHeaders: HeadersInit = {}
  if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1') authHeaders['x-dev-auth-uid'] = 'dev-user'

  // Trigger recompute for today (idempotent) then read
  async function load() {
    const h = nextHeaders()
    const proto = h.get('x-forwarded-proto') ?? 'http'
    const host = h.get('host') ?? 'localhost:9010'
    const origin = `${proto}://${host}`
    const jsonHeaders: HeadersInit = { 'content-type': 'application/json', ...authHeaders }

    await fetch(`${origin}/api/budget/recompute`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ tenantId, planId, dates: [new Date().toISOString().slice(0,10)] }),
      cache: 'no-store'
    })
    const r = await fetch(`${origin}/api/budget/read?tenantId=${tenantId}&planId=${planId}`, {
      headers: authHeaders,
      cache: 'no-store'
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  }

  // simple RSC pattern
  // @ts-expect-error Async Server Component
  const View = async () => {
    const data = await load()
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Budget — {data.periodKey}</h1>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr><th className="text-left p-2">Envelope</th><th className="p-2">Planned</th><th className="p-2">Carry In</th><th className="p-2">Actual</th><th className="p-2">Remaining</th><th className="p-2">Adjust</th></tr>
          </thead>
          <tbody>
            {data.envelopes?.map((e: any) => (
              <tr key={e.envId} className="border-t">
                <td className="p-2">{e.envId}</td>
                <td className="p-2">${(e.plannedCents/100).toFixed(2)}</td>
                <td className="p-2">${(e.carryInCents/100).toFixed(2)}</td>
                <td className="p-2">${(e.actualCents/100).toFixed(2)}</td>
                <td className="p-2">${(e.remainingCents/100).toFixed(2)}</td>
                <td className="p-2">
                  {/* @ts-expect-error Server component embedding client island */}
                  <AdjustButtons tenantId={tenantId} planId={planId} periodKey={data.periodKey} envId={e.envId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return <View />
}

export default function Page(){
  return (
    <Suspense fallback={null}>
      {/* uses server fetches, safe in RSC */}
      {/* @ts-expect-error Async Server Component */}
      <BudgetInner />
    </Suspense>
  )
}
