
'use client'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useRecomputeBatch } from '@/hooks/useRecomputeBatch'
import { DriftButton } from '@/components/settings/DriftButton'
import { abs } from '@/lib/url'

export function RuleEditor({ initial }: { initial: any[] }){
  const [rules, setRules] = useState(initial)
  const [pending, start] = useTransition()
  const r = useRouter()
  const dev = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1'
  const [testInput, setTestInput] = useState('Starbucks Market #123')
  const [applyDays, setApplyDays] = useState(30)
  const [merchants, setMerchants] = useState<string[]>([])
  const [dryRunResult, setDryRunResult] = useState<any>(null)
  const [busy, setBusy] = useState<'idle'|'scanning'|'recomputing'|'done'>('idle')
  const [preview, setPreview] = useState<any[]|null>(null)
  const { toast } = useToast()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [merchantKeep, setMerchantKeep] = useState<Record<string, boolean>>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [createMerchant, setCreateMerchant] = useState<string>('')
  const [envOptions, setEnvOptions] = useState<Array<{id:string;name:string}>>([])
  const [envId, setEnvId] = useState('')
  const [accounts, setAccounts] = useState<Array<{id:string,name:string,mask?:string}>>([])
  const [scope, setScope] = useState<{ since?:string; until?:string; accountId?:string }>({})
  const { progress, run: runRecompute } = useRecomputeBatch()


  async function refresh(){
    const resp = await fetch(abs(`/api/categorizer/rules?tenantId=dev`), { headers: dev ? { 'x-dev-auth-uid': 'dev-user' } : undefined, cache: 'no-store' })
    const data = await resp.json();
    setRules(data.items || [])
  }
  useEffect(()=>{ setRules(initial) }, [initial])

  useEffect(() => { 
    const headers: HeadersInit = {}
    if (dev) (headers as any)['x-dev-auth-uid'] = 'dev-user'
    
    ;(async () => {
      const r = await fetch(abs(`/api/categorizer/merchants?tenantId=dev&days=60`), { headers, cache: 'no-store' })
      if (r.ok) setMerchants((await r.json()).merchants)
    })();

    fetch(abs('/api/accounts?tenantId=dev'), { headers })
      .then(r=>r.json()).then(j=> setAccounts(Array.isArray(j.items)? j.items : []))
      .catch(()=> setAccounts([]))
  }, [dev])


  async function addOrSave(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const merchantPattern = String(fd.get('merchantPattern')||'').trim()
    const envId = String(fd.get('envId')||'').trim()
    if (!merchantPattern || !envId){ alert('Invalid rule'); return }
    const headers: HeadersInit = { 'content-type': 'application/json' }
    if (dev) (headers as any)['x-dev-auth-uid'] = 'dev-user'
    const res = await fetch(abs(`/api/categorizer/rules?tenantId=dev`), { method: 'POST', headers, body: JSON.stringify({ merchantPattern, envId }) })
    if (!res.ok) { alert(await res.text()); return }
    (e.currentTarget as HTMLFormElement).reset()
    await refresh()
  }

  async function remove(id: string){
    if(!confirm(`Are you sure you want to delete rule ${id}?`)) return;
    const headers: HeadersInit = {}
    if (dev) (headers as any)['x-dev-auth-uid'] = 'dev-user'
    const res = await fetch(abs(`/api/categorizer/rules?tenantId=dev&id=${encodeURIComponent(id)}`), { method: 'DELETE', headers })
    if (!res.ok) { alert(await res.text()); return }
    await refresh()
  }

  const testMatches = useMemo(() => {
    return rules
      .filter((r:any) => new RegExp(r.merchantPattern,'i').test(testInput))
      .map((r:any) => `${r.splits?.[0]?.envId || r.envId}${r.pct?` (${r.pct}%)`:''}`)
  }, [rules, testInput])

  async function applyNow(dryRun = true){
    setBusy('scanning')
    const headers: HeadersInit = { 'content-type': 'application/json' }
    if (dev) (headers as any)['x-dev-auth-uid'] = 'dev-user'
    const res = await fetch(abs(`/api/categorizer/apply`), { method: 'POST', headers, body: JSON.stringify({ tenantId: 'dev', days: applyDays, dryRun }) })
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
      await refresh(); // Refresh rules to show any changes
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
    const res = await fetch(abs(`/api/categorizer/apply`), { method: 'POST', headers, body: JSON.stringify({ tenantId: 'dev', dryRun: false, onlyTxIds: ids, triggerRecompute: true }) })
    const body = await (res.ok ? res.json() : res.text())
    setBusy('done')
    if (!res.ok) { toast({ variant: 'destructive', title: 'Apply failed', description: String(body).slice(0,300) }); return }
    toast({ title: 'Applied selected', description: `Updated ${body.updated} txns; recomputed ${body.recomputed} periods` })
    // clear preview after apply
    setPreview(null); setSelectedIds(new Set()); setMerchantKeep({})
    await refresh()
  }

  async function openCreateFor(merchant: string){
    setCreateMerchant(merchant)
    setCreateOpen(true)
    try {
      const headers: HeadersInit = {}
      if (dev) (headers as any)['x-dev-auth-uid'] = 'dev-user'
      const r = await fetch(abs(`/api/budget/envelopes?tenantId=dev`), { headers })
      const j = await r.json().catch(()=>({ envelopes: [] }))
      setEnvOptions(j.envelopes || [])
      setEnvId(j.envelopes?.[0]?.id || 'misc')
    } catch { setEnvOptions([]); setEnvId('misc') }
  }

  async function createRule(){
    const headers: HeadersInit = { 'content-type': 'application/json' }
    if (dev) (headers as any)['x-dev-auth-uid'] = 'dev-user'
    const res = await fetch(abs(`/api/categorizer/rules?tenantId=dev`), { method:'POST', headers, body: JSON.stringify({ tenantId: 'dev', merchantPattern: createMerchant, envId }) })
    const body = await (res.ok ? res.json() : res.text())
    if (!res.ok) { toast({ variant: 'destructive', title:'Create rule failed', description: String(body).slice(0,300) }); return }
    toast({ title:'Rule created', description: `${createMerchant} → ${envId}` })
    setCreateOpen(false)
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
        <button disabled={pending} className="px-3 py-1 rounded border">{pending? 'Saving…':'Add rule'}</button>
      </form>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left">
            <th className="p-2">Merchant regex</th>
            <th className="p-2">Envelope</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r:any)=> (
            <tr key={r.id} className="border-t">
              <td className="p-2 font-mono text-xs">{r.merchantPattern}</td>
              <td className="p-2">{(r.splits||[]).map((s:any)=>`${s.envId} (${s.pct}%)`).join(', ')}</td>
              <td className="p-2 flex gap-2">
                <DriftButton ruleId={r.id} />
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
              <input type="checkbox" checked={busy==='idle' || (preview != null)} onChange={e=>setPreview(e.target.checked ? preview : null)} /> Dry run
            </label>
            <button onClick={()=>applyNow(busy === 'idle' || !!preview)} className="px-3 py-1 rounded border" disabled={busy!=='idle' && busy !== 'done'}>{busy!=='idle' && busy !== 'done' ?'Running…':'Run'}</button>
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
          {preview && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-1">Filter by merchant</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {Object.keys(merchantKeep).sort().map(m => {
                  const isUnknown = preview?.some(p=>p.merchant===m && p.matchReason?.type==='none')
                  return (
                  <div key={m} className="flex items-center gap-2">
                    <button onClick={()=>toggleMerchant(m)}
                          className={`px-2 py-1 rounded-full border text-xs ${merchantKeep[m]?'bg-green-50 border-green-300':'bg-gray-50 border-gray-300 text-gray-500'}`}
                          title={m}>
                      {merchantKeep[m]?'Keep':'Skip'} · {m}
                    </button>
                    {isUnknown && (
                      <button onClick={()=>openCreateFor(m)} className="text-xs underline text-blue-600">Create rule</button>
                    )}
                  </div>)
                })}
              </div>
              <div className="flex items-center gap-2 mb-2 text-xs">
                <button className="px-2 py-1 border rounded" onClick={()=>setAllRows(true)}>Keep all</button>
                <button className="px-2 py-1 border rounded" onClick={()=>setAllRows(false)}>Skip all</button>
                <span className="text-gray-500">Selected {selectedIds.size} of {preview.length}</span>
              </div>
            </div>
          )}

          {/* Dry run preview */}
          {preview && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-1">Dry run result</div>
              <div className="text-xs text-gray-500 mb-2">Showing up to {preview.length} matches</div>
              <div className="max-h-48 overflow-auto border rounded">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50"><tr><th className="px-2 py-1"></th><th className="px-2 py-1 text-left">Date</th><th className="px-2 py-1 text-left">Merchant</th><th className="px-2 py-1 text-right">Amount</th><th className="px-2 py-1">Splits</th><th className="px-2 py-1">Reason</th></tr></thead>
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
                        <td className="px-2 py-1 text-xs text-gray-600">
                          {p.matchReason?.type==='rule' ? (
                            <div className="inline-flex items-center gap-2">
                              <span>{`rule:${p.matchReason.ruleId}`}</span>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="underline text-blue-600">Why?</button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[340px] text-xs">
                                  <div className="font-medium mb-1">Why this rule?</div>
                                  
                                  {/* Editable Pattern */}
                                  <div className="mb-1">
                                    <span className="text-gray-500 mr-2">Pattern:</span>
                                    <input
                                      className="border rounded px-2 py-1 w-[220px]"
                                      value={(p.why?.regex ?? p.matchReason?.type==='rule' ? (p.matchReason as any).pattern : '') as string}
                                      onChange={(e)=>{
                                        const val = e.target.value
                                        setPreview(prev => prev!.map(row => row.txId===p.txId ? ({
                                          ...row,
                                          why: { ...(row.why||{}), regex: val, flags: 'i' }
                                        }) : row))
                                      }}
                                    />
                                  </div>
                                  {p.why?.groups?.length ? (
                                    <div className="mb-1"><span className="text-gray-500">Groups:</span> {p.why?.groups.map((g:any,i:number)=>(<code key={i} className="mr-1">${i+1}:{g}</code>))}</div>
                                  ) : null}
                                  
                                  {/* Editable Splits (envId + pct) */}
                                  <div className="mb-1 text-gray-500">Splits (must total 100%)</div>
                                  <div className="mb-2 space-y-1">
                                    {(p.why?.splits ?? []).map((s:any, i:number) => (
                                      <div key={i} className="flex items-center gap-2">
                                        <input className="border rounded px-2 py-0.5 w-28" value={s.envId}
                                          onChange={(e)=>{
                                            const v = e.target.value
                                            setPreview(prev => prev!.map(row => row.txId===p.txId ? ({
                                              ...row,
                                              why: { ...(row.why||{}), splits: (row.why!.splits||[]).map((x:any,ix:any)=> ix===i? { ...x, envId: v }: x) }
                                            }) : row))
                                          }} />
                                        <input type="number" min={0} max={100} className="border rounded px-2 py-0.5 w-20" value={s.pct}
                                          onChange={(e)=>{
                                            const v = Math.max(0, Math.min(100, Number(e.target.value)))
                                            setPreview(prev => prev!.map(row => row.txId===p.txId ? ({
                                              ...row,
                                              why: { ...(row.why||{}), splits: (row.why!.splits||[]).map((x:any,ix:any)=> ix===i? { ...x, pct: v }: x) }
                                            }) : row))
                                          }} />
                                        <span className="text-gray-400 text-xs">%</span>
                                        <span className="text-gray-500 text-xs">→ {(s.amountCents/100).toFixed(2)}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <button
                                      className="px-2 py-1 border rounded"
                                      onClick={async()=>{
                                        try {
                                          const headers: HeadersInit = { 'content-type': 'application/json' }
                                          if (dev) (headers as any)['x-dev-auth-uid'] = 'dev-user'
                                          const body = {
                                            tenantId: 'dev',
                                            merchantPattern: p.why?.regex || '',
                                            splits: (p.why?.splits||[]).map((x:any)=>({ envId: x.envId, pct: x.pct })),
                                            limit: 100,
                                          }
                                          const r = await fetch(abs(`/api/categorizer/rules/simulate`), { method:'POST', headers, body: JSON.stringify(body) })
                                          const j = await (r.ok ? r.json() : r.text())
                                          if (!r.ok) throw new Error(String(j))
                                          // local annotate: show hit count + swap first few rows’ why/splits amounts to the simulated amounts
                                          const first = Array.isArray(j.sample) ? j.sample : []
                                          setPreview(prev => prev!.map(row => {
                                            const s = first.find((x:any)=>x.txId===row.txId)
                                            return s ? ({ ...row, why: { ...(row.why||{}), splits: s.splits }, splits: s.splits }) : row
                                          }))
                                          toast({ title: 'Simulated', description: `${j.hits} matches in last 100 txns` })
                                        } catch(e:any) {
                                          toast({ variant: 'destructive', title: 'Simulation failed', description: String(e).slice(0,200) })
                                        }
                                      }}
                                    >Simulate (last 100)</button>
                                    <button
                                      className="px-2 py-1 border rounded"
                                      onClick={async()=>{
                                        try {
                                          const headers: HeadersInit = { 'content-type': 'application/json' }
                                          if (dev) (headers as any)['x-dev-auth-uid'] = 'dev-user'
                                          const res = await fetch(abs(`/api/categorizer/rules/${(p.matchReason as any).ruleId}`), {
                                            method: 'PATCH', headers,
                                            body: JSON.stringify({
                                              tenantId: 'dev',
                                              merchantPattern: p.why?.regex,
                                              splits: (p.why?.splits||[]).map((x:any)=>({ envId: x.envId, pct: x.pct }))
                                            })
                                          })
                                          if (!res.ok) throw new Error(await res.text())
                                          toast({ title: 'Rule updated', description: 'Saved edits' })
                                        } catch(e:any) {
                                          toast({ variant: 'destructive', title: 'Save failed', description: String(e).slice(0,200) })
                                        }
                                      }}
                                    >Save edits</button>
                                     <button
                                      className="px-2 py-1 border rounded bg-emerald-50"
                                      onClick={async()=>{
                                        if (!confirm('Apply this rule to recent matching transactions?')) return
                                        try {
                                          const headers: HeadersInit = { 'content-type': 'application/json' }
                                          if (dev) (headers as any)['x-dev-auth-uid'] = 'dev-user'
                                          const body = {
                                            tenantId: 'dev',
                                            merchantPattern: p.why?.regex || (p.matchReason as any)?.pattern,
                                            splits: (p.why?.splits||[]).map((x:any)=>({ envId: x.envId, pct: x.pct })),
                                            limit: 500, since: scope.since, until: scope.until, accountId: scope.accountId,
                                            triggerRecompute: false
                                          }
                                          const r = await fetch(abs(`/api/categorizer/rules/apply`), { method:'POST', headers, body: JSON.stringify(body) })
                                          const j = await (r.ok ? r.json() : r.text())
                                          if (!r.ok) throw new Error(String(j))
                                          toast({ title: 'Applied', description: `${j.count} transactions updated` })
                                          // Now batch recompute with progress
                                          const h: HeadersInit = { 'content-type':'application/json' }
                                          if (dev) (h as any)['x-dev-auth-uid'] = 'dev-user'
                                          await runRecompute(j.dates || [], h)
                                          toast({ title: 'Recompute complete', description: `${(j.dates||[]).length} dates refreshed` })
                                        } catch(e:any) {
                                          toast({ variant: 'destructive', title: 'Apply failed', description: String(e).slice(0,200) })
                                        }
                                      }}
                                    >Apply to matches</button>
                                    <button
                                      className="px-2 py-1 border rounded bg-rose-50"
                                      onClick={async()=>{
                                        if (!confirm('Undo the most recent rule apply?')) return
                                        try {
                                          const headers: HeadersInit = { 'content-type': 'application/json' }
                                          if (dev) (headers as any)['x-dev-auth-uid'] = 'dev-user'
                                          const r = await fetch(abs(`/api/categorizer/rules/undo`), { method:'POST', headers, body: JSON.stringify({ tenantId: 'dev' }) })
                                          const j = await (r.ok ? r.json() : r.text())
                                          if (!r.ok) throw new Error(String(j))
                                          toast({ title: 'Undo complete', description: `${j.undone} transactions reverted` })
                                        } catch(e:any) {
                                          toast({ variant: 'destructive', title: 'Undo failed', description: String(e).slice(0,200) })
                                        }
                                      }}
                                    >Undo last apply</button>
                                  </div>

                                   {dryRunResult && (
                                     <div className="mt-2 max-h-56 overflow-auto border rounded">
                                       <table className="w-full text-xs">
                                         <thead className="bg-gray-50"><tr>
                                           <th className="text-left px-2 py-1">Tx</th>
                                           <th className="text-left px-2 py-1">Merchant</th>
                                           <th className="text-right px-2 py-1">Amount</th>
                                           <th className="text-left px-2 py-1">Prev</th>
                                           <th className="text-left px-2 py-1">Next</th>
                                         </tr></thead>
                                         <tbody>
                                           {dryRunResult.sample?.map((s:any)=>(
                                             <tr key={s.txId} className="odd:bg-white even:bg-gray-50">
                                               <td className="px-2 py-1 font-mono">{s.txId.slice(0,6)}</td>
                                               <td className="px-2 py-1">{s.merchant}</td>
                                               <td className="px-2 py-1 text-right">{(s.amountCents/100).toFixed(2)}</td>
                                               <td className="px-2 py-1">
                                                 {(s.prev?.splits||[]).map((x:any)=>`${x.envId}:${(x.amountCents/100).toFixed(2)}`).join(', ')||'—'}
                                               </td>
                                               <td className="px-2 py-1">
                                                 {(s.next?.splits||[]).map((x:any)=>`${x.envId}:${(x.amountCents/100).toFixed(2)}`).join(', ')}
                                               </td>
                                             </tr>
                                           ))}
                                         </tbody>
                                       </table>
                                     </div>
                                    )}
                                  
                                  <div className="mt-4 flex items-center gap-3">
                                    <Label htmlFor={`rule-act-${p.matchReason.ruleId}`} className="text-gray-500">Active</Label>
                                    <Switch id={`rule-act-${p.matchReason.ruleId}`}
                                      checked={!!p.matchReason.active}
                                      onCheckedChange={async(val)=>{
                                        try {
                                          const headers: HeadersInit = { 'content-type': 'application/json' }
                                          if (dev) (headers as any)['x-dev-auth-uid'] = 'dev-user'
                                          const res = await fetch(abs(`/api/categorizer/rules/${p.matchReason.ruleId}`), { method:'PATCH', headers, body: JSON.stringify({ tenantId: 'dev', active: !!val }) })
                                          if (!res.ok) throw new Error(await res.text())
                                          // reflect in local preview state immutably
                                          setPreview(prev => prev!.map(row => row.txId===p.txId ? ({
                                            ...row,
                                            matchReason: { ...(row.matchReason as any), active: !!val }
                                          }) : row))
                                          toast({ title: 'Rule updated', description: `rule:${p.matchReason.ruleId} active=${!!val}` })
                                        } catch (e:any) {
                                          toast({ variant: 'destructive', title: 'Update failed', description: String(e).slice(0,200) })
                                        }
                                      }}
                                    />
                                  </div>
                                   {progress && <div className="text-xs text-gray-600">Recompute: {progress.done}/{progress.total}</div>}
                                </PopoverContent>
                              </Popover>
                            </div>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                    {!preview.length && <tr><td colSpan={6} className="text-center p-4 text-gray-500">No transactions to update.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={applySelected} className="px-3 py-1 rounded border">Apply selected now</button>
                <button onClick={() => applyNow(false)} className="px-3 py-1 rounded border">Apply all shown</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Create Rule modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-background p-4 rounded-xl w-[420px] shadow-xl border">
            <div className="text-sm font-medium mb-2">Create rule</div>
            <div className="text-xs text-muted-foreground mb-3">Merchant pattern</div>
            <input className="w-full border rounded px-2 py-1 mb-3" value={createMerchant} onChange={e=>setCreateMerchant(e.target.value)} />
            <div className="text-xs text-muted-foreground mb-1">Envelope</div>
            {envOptions.length ? (
              <select className="w-full border rounded px-2 py-1 mb-4" value={envId} onChange={e=>setEnvId(e.target.value)}>
                {envOptions.map(o=> <option key={o.id} value={o.id}>{o.name} ({o.id})</option>)}
              </select>
            ) : (
              <input className="w-full border rounded px-2 py-1 mb-4" value={envId} onChange={e=>setEnvId(e.target.value)} placeholder="e.g. groceries" />
            )}
            <div className="flex items-center justify-end gap-2">
              <button className="px-3 py-1 border rounded" onClick={()=>setCreateOpen(false)}>Cancel</button>
              <button className="px-3 py-1 border rounded" onClick={createRule}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
