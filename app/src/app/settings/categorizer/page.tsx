
import { headers as nextHeaders } from 'next/headers'
import { Suspense } from 'react'
import { RuleEditor } from '@/components/settings/RuleEditor'

async function fetchRules(){
  const h = nextHeaders()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const host = h.get('host') ?? 'localhost:9010'
  const origin = `${proto}://${host}`
  const r = await fetch(`${origin}/api/categorizer/rules?tenantId=dev`, {
    headers: { 'x-dev-auth-uid': 'dev-user' }, cache: 'no-store'
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export default async function Page(){
  const data = await fetchRules()
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-semibold mb-4">Categorizer Rules</h1>
      <p className="text-sm text-gray-500 mb-4">Regex → Envelope rules. Example: <code>market|grocery</code> → <code>Groceries</code>.</p>
      {/* @ts-expect-error Async Server Component boundary */}
      <Suspense>
        <RuleEditor initial={data.items || []} />
      </Suspense>
    </div>
  )
}
