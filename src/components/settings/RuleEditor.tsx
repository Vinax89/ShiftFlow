'use client'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'

export function RuleEditor({ initial }: { initial: any[] }){
  const [rules, setRules] = useState(initial)
  const [pending, start] = useTransition()
  const r = useRouter()
  const dev = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1'
  const [testInput, setTestInput] = useState('Starbucks Market #123')
  const [applyDays, setApplyDays] = useState(30)
  const [merchants, setMerchants] = useState<string[]>([])
  const [dryRun, setDryRun] = useState(true)
  const [busy, setBusy] = useState<'idle'|'scanning'|'recomputing'|'done'>('idle')
  const [preview, setPreview] = useState<any[]|null>(null)
  const { toast } = useToast()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [merchantKeep, setMerchantKeep] = useState<Record<string, boolean>>({})

  async function refresh(){
    const resp = await fetch(`/api/categorizer/rules?tenantId=dev`, { headers: dev ? { 'x-dev-auth-uid': 'dev-user' } : undefined, cache: 'no-store' })
    setRules((await resp.json()).rules)
  }
  useEffect(()=>{ setRules(initial) }, [initial])

  useEffect(() => { (async () => {
    const headers: HeadersInit = {}
    if (dev) (headers as any)['x-dev-auth-uid'] = 'dev-user'
    const r = await fetch(`/api/categorizer/merchants?tenantId=dev&days=60`, { headers, cache: 'no-store' })
    if (r.ok) setMerchants((await r.json()).merchants)
  })() }, [dev])

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

  const testMatches = useMemo(() => {
    return initial
      .filter((r:any) => new RegExp(r.merchantPattern,'i').test(testInput))
      .map((r:any) => `${r.envId}${r.pct?` (${r.pct}%)`:''}`)
  }, [initial, testInput])

  async function applyNow(){
    setBusy('scanning')
    const headers: HeadersInit = { 'content-type': 'application/json' }
    if (dev) (headers as any)['x-dev-auth-uid'] = 'dev-user'
    const res = await fetch(`/api/categorizer/apply`, { method: 'POST', headers, body: JSON.stringify({ tenantId: 'dev', days: applyDays, dryRun }) })
    const body = await (res.ok ? res.json() : res.text())
    if (!res.ok) {
      setBusy('idle')
      toast({ variant: 'destructive', title: 'Apply failed', description: String(body).slice(0,300) })
      return
    }
    if (dryRun) {
      const pv = (body.preview || []) as any[]
      setPreview(pv)
      // default: keep all
      setSelectedIds(new Set(pv.map(p=>p.txId)))
      // compute merchant chips
      const uniq: Record<string, number> = {}
      for (const p of pv){ uniq[p.merchant] = (uniq[p.merchant]||0)+1 }
      const mk: Record<string, boolean> = {}
      Object.keys(uniq).forEach(m=> mk[m] = true)
      setMerchantKeep(mk)
      setBusy('done')
      toast({ title: 'Dry run complete', description: `Would update ${body.updated} txns across ${body.dates?.length||0} dates` })
    } else {
      setBusy('recomputing')
      setPreview(null)
      setBusy('done')
      toast({ title: 'Apply complete', description: `Updated ${body.updated} txns; recomputed ${body.recomputed} periods` })
    }
  }

  function toggleRow(id: string){
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function setAllRows(on: boolean){
    if (!preview) return
    setSelectedIds(new Set(on ? preview.map(p=>p.txId) : []))
    setMerchantKeep(Object.fromEntries(Object.keys(merchantKeep).map(m=>[m,on])))
  }

  function toggleMerchant(m: string){
    setMerchantKeep(prev => {
      const next = { ...prev, [m]: !prev[m] }
      // sync row selection for this merchant
      if (preview){
        const ids = new Set(selectedIds)
        for (const p of preview) if (p.merchant === m) { next[m] ? ids.add(p.txId) : ids.delete(p.txId) }
        setSelectedIds(ids)
      }
      return next
    })
  }

  async function applySelected(){
    if (!preview) return
    const ids = Array.from(selectedIds)
    if (!ids.length) { toast({ title: 'Nothing selected', description: 'Choose at least one transaction' }); return }
    setBusy('recomputing')
    const headers: HeadersInit = { 'content-type': 'application/json' }
    if (dev) (headers as any)['x-dev-auth-uid'] = 'dev-user'
    const res = await fetch(`/api/categorizer/apply`, { method: 'POST', headers, body: JSON.stringify({ tenantId: 'dev', dryRun: false, onlyTxIds: ids }) })
    const body = await (res.ok ? res.json() : res.text())
    setBusy('done')
    if (!res.ok) { toast({ variant: 'destructive', title: 'Apply failed', description: String(body).slice(0,300) }); return }
    toast({ title: 'Applied selected', description: `Updated ${body.updated} txns; recomputed ${body.recomputed} periods` })
    // clear preview after apply
    setPreview(null); setSelectedIds(new Set()); setMerchantKeep({})
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

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-3 border rounded">
          <div className="text-sm font-medium mb-2">Regex tester</div>
          <input value={testInput} onChange={e=>setTestInput(e.target.value)} className="w-full border rounded px-2 py-1" />
          <div className="text-xs text-gray-500 mt-2">Matches: {testMatches.join(', ') || '—'}</div>
          <div className="mt-3 max-h-40 overflow-auto text-xs">
            {merchants.slice(0,30).map(m => (
              <button key={m} onClick={()=>setTestInput(m)} className="block w-full text-left hover:bg-gray-50 px-2 py-1 truncate">{m}</button>
            ))}
          </div>
        </div>
        <div className="p-3 border rounded">
          <div className="text-sm font-medium mb-2">Apply rules now</div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Days</label>
            <input type="number" min={1} max={90} value={applyDays} onChange={e=>setApplyDays(Number(e.target.value||30))} className="w-24 border rounded px-2 py-1" />
            <label className="text-sm inline-flex items-center gap-2 ml-2">
              <input type="checkbox" checked={dryRun} onChange={e=>setDryRun(e.target.checked)} /> Dry run
            </label>
            <button onClick={applyNow} className="px-3 py-1 rounded border" disabled={busy!=='idle'}>{busy!=='idle'?'Running…':'Run'}</button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Backfills uncategorized txns and recomputes affected periods.</p>

          {/* Progress */}
          {busy!=='idle' && busy!=='done' && (
            <div className="mt-3">
              <div className="h-2 w-full bg-gray-100 rounded overflow-hidden">
                <div className="h-full w-2/3 animate-pulse bg-gray-300" />
              </div>
              <div className="text-xs text-gray-500 mt-1">{busy==='scanning'?'Scanning & matching…':busy==='recomputing'?'Recomputing periods…':'Done'}</div>
            </div>
          )}

          {/* Merchant chips */}
          {dryRun && preview && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-1">Filter by merchant</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {Object.keys(merchantKeep).sort().map(m => (
                  <button key={m} onClick={()=>toggleMerchant(m)}
                          className={`px-2 py-1 rounded-full border text-xs ${merchantKeep[m]?'bg-green-50 border-green-300':'bg-gray-50 border-gray-300 text-gray-500'}`}
                          title={m}>
                    {merchantKeep[m]?'Keep':'Skip'} · {m}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mb-2 text-xs">
                <button className="px-2 py-1 border rounded" onClick={()=>setAllRows(true)}>Keep all</button>
                <button className="px-2 py-1 border rounded" onClick={()=>setAllRows(false)}>Skip all</button>
                <span className="text-gray-500">Selected {selectedIds.size} of {preview.length}</span>
              </div>
            </div>
          )}

          {/* Dry run preview */}
          {dryRun && preview && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-1">Dry run result</div>
              <div className="text-xs text-gray-500 mb-2">Showing up to {preview.length} matches</div>
              <div className="max-h-48 overflow-auto border rounded">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50"><tr><th className="px-2 py-1"></th><th className="px-2 py-1 text-left">Date</th><th className="px-2 py-1 text-left">Merchant</th><th className="px-2 py-1 text-right">Amount</th><th className="px-2 py-1">Splits</th></tr></thead>
                  <tbody>
                    {preview.map((p)=> (
                      <tr key={p.txId} className="border-t">
                        <td className="px-2 py-1 text-center">
                          <input type="checkbox" checked={selectedIds.has(p.txId)} onChange={()=>toggleRow(p.txId)} />
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">{p.date}</td>
                        <td className="px-2 py-1 truncate max-w-[12rem]" title={p.merchant}>{p.merchant}</td>
                        <td className="px-2 py-1 text-right">{(p.amountCents/100).toFixed(2)}</td>
                        <td className="px-2 py-1">
                          {(p.splits||[]).map((s:any)=>`${s.envId}:${(s.amountCents/100).toFixed(2)}`).join(', ')}
                        </td>
                      </tr>
                    ))}
                    {!preview.length && <tr><td colSpan={4} className="text-center p-4 text-gray-500">No transactions to update.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={applySelected} className="px-3 py-1 rounded border">Apply selected now</button>
                <button onClick={async()=>{ setDryRun(false); await applyNow(); setDryRun(true) }} className="px-3 py-1 rounded border">Apply all shown</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
