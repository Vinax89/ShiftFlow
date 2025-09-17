'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function RuleEditor({ initial }: { initial: any[] }){
  const [rules, setRules] = useState(initial)
  const [pending, start] = useTransition()
  const r = useRouter()
  const dev = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1'

  async function refresh(){
    const resp = await fetch(`/api/categorizer/rules?tenantId=dev`, { headers: dev ? { 'x-dev-auth-uid': 'dev-user' } : undefined, cache: 'no-store' })
    setRules((await resp.json()).rules)
  }
  useEffect(()=>{ setRules(initial) }, [initial])

  async function addOrSave(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const merchantPattern = String(fd.get('merchantPattern')||'').trim()
    const envId = String(fd.get('envId')||'').trim()
    const pct = Number(fd.get('pct')||'100')
    if (!merchantPattern || !envId || pct<1 || pct>100){ alert('Invalid rule'); return }
    const headers: HeadersInit = { 'content-type': 'application/json' }
    if (dev) (headers as any)['x-dev-auth-uid'] = 'dev-user'
    const res = await fetch(`/api/categorizer/rules?tenantId=dev`, { method: 'POST', headers, body: JSON.stringify({ merchantPattern, envId, pct }) })
    if (!res.ok) { alert(await res.text()); return }
    (e.currentTarget as HTMLFormElement).reset()
    await refresh()
  }

  async function remove(id: string){
    const headers: HeadersInit = {}
    if (dev) (headers as any)['x-dev-auth-uid'] = 'dev-user'
    const res = await fetch(`/api/categorizer/rules?tenantId=dev&id=${encodeURIComponent(id)}`, { method: 'DELETE', headers })
    if (!res.ok) { alert(await res.text()); return }
    await refresh()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={e=>start(()=>addOrSave(e))} className="flex flex-wrap gap-2 items-end">
        <label className="flex-1 min-w-[240px]">
          <div className="text-xs text-gray-500 mb-1">Merchant regex</div>
          <input name="merchantPattern" className="w-full border rounded px-2 py-1" placeholder="market|grocery" />
        </label>
        <label>
          <div className="text-xs text-gray-500 mb-1">Envelope</div>
          <input name="envId" className="w-40 border rounded px-2 py-1" placeholder="Groceries" />
        </label>
        <label>
          <div className="text-xs text-gray-500 mb-1">Percent</div>
          <input name="pct" type="number" min={1} max={100} defaultValue={100} className="w-24 border rounded px-2 py-1" />
        </label>
        <button disabled={pending} className="px-3 py-1 rounded border">{pending? 'Saving…':'Add rule'}</button>
      </form>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left">
            <th className="p-2">Merchant regex</th>
            <th className="p-2">Envelope</th>
            <th className="p-2">%</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r:any)=> (
            <tr key={r.id} className="border-t">
              <td className="p-2 font-mono text-xs">{r.merchantPattern}</td>
              <td className="p-2">{r.envId}</td>
              <td className="p-2">{r.pct ?? 100}</td>
              <td className="p-2">
                <button onClick={()=>remove(r.id)} className="px-2 py-1 rounded border">Delete</button>
              </td>
            </tr>
          ))}
          {!rules.length && (
            <tr><td className="p-4 text-gray-500" colSpan={4}>No rules yet. Add one above.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
