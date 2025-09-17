import { Suspense } from 'react'
import { headers as nextHeaders } from 'next/headers'
import { AdjustButtons } from '@/components/budget/AdjustButtons'

function BudgetInner() {
  // dev defaults; replace with user context later
  const tenantId = 'dev'
  const planId = 'baseline'
  // Always include dev-bypass header in local preview; prod rules still enforce real auth
  const authHeaders: HeadersInit = { 'x-dev-auth-uid': 'dev-user' }

  // Trigger recompute for today (idempotent) then read
  async function load() {
    const h = nextHeaders()
    const proto = h.get('x-forwarded-proto') ?? 'http'
    const host = h.get('host') ?? 'localhost:9010'
    const origin = `${proto}://${host}`
    const jsonHeaders: HeadersInit = { 'content-type': 'application/json', ...authHeaders }
    const today = new Date().toISOString().slice(0,10)

    try {
      // 1) recompute (ignore body, but surface status)
      const r1 = await fetch(`${origin}/api/budget/recompute`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ tenantId, planId, dates: [today] }),
        cache: 'no-store'
      })
      if (!r1.ok) {
        const body = await r1.text().catch(()=>'')
        throw new Error(`POST /api/budget/recompute ${r1.status} ${body}`)
      }

      // 2) read; if 404, try one more recompute then re-read (race-proof)
      let r = await fetch(`${origin}/api/budget/read?tenantId=${tenantId}&planId=${planId}`, {
        headers: authHeaders,
        cache: 'no-store'
      })
      if (r.status === 404) {
        await fetch(`${origin}/api/budget/recompute`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ tenantId, planId, dates: [today] }),
          cache: 'no-store'
        })
        r = await fetch(`${origin}/api/budget/read?tenantId=${tenantId}&planId=${planId}`, {
          headers: authHeaders,
          cache: 'no-store'
        })
      }

      if (r.status === 404) {
        return null; // Gracefully handle not found after retry
      }

      if (!r.ok) {
        const body = await r.text().catch(()=>'')
        throw new Error(`GET /api/budget/read ${r.status} ${body}`)
      }
      return r.json()
    } catch (e: any) {
        console.error('Failed to load budget data:', e);
        // In case of any error, we return null to be handled gracefully by the UI.
        return null;
    }
  }

  // simple RSC pattern
  // @ts-expect-error Async Server Component
  const View = async () => {
    const data = await load()

    if (!data) {
      return (
        <div className="p-6">
          <h1 className="text-xl font-semibold mb-4">Budget Not Ready</h1>
          <p className="text-muted-foreground">The budget for the current period is still being calculated or an error occurred. Please try again in a moment.</p>
        </div>
      )
    }

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
    <Suspense fallback={<div className="p-6">Loading budget...</div>}>
      {/* uses server fetches, safe in RSC */}
      {/* @ts-expect-error Async Server Component */}
      <BudgetInner />
    </Suspense>
  )
}
