'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function DriftButton({ ruleId }: { ruleId:string }){
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<any>(null)
  
  async function run(){
    setData(null) // clear old data
    setOpen(true)
    const headers: HeadersInit = { 'content-type':'application/json' }
    ;(headers as any)['x-dev-auth-uid'] = 'dev-user'
    const r = await fetch('/api/categorizer/rules/drift', { method:'POST', headers, body: JSON.stringify({ tenantId:'dev', ruleId, lookbackDays:30 }) })
    const j = await (r.ok? r.json(): r.text()); if(!r.ok) throw new Error(String(j))
    setData(j)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={run}>Drift report</Button>
      </DialogTrigger>
      <DialogContent className="w-[520px]">
        <DialogHeader>
          <DialogTitle>Drift report for rule: {ruleId}</DialogTitle>
        </DialogHeader>
        {data ? (
          <div className="space-y-2 text-sm">
            <div>Matched: {data.matched}</div>
            <div>Applied by rule: {data.applied}</div>
            <div>Manual overrides: {data.overrides}</div>
            <div>Accuracy: <strong>{(data.accuracy*100).toFixed(1)}%</strong></div>
            <div>Status: <span className={data.status==='drifting'?'text-rose-600':'text-emerald-600'}>{data.status}</span></div>
            <div className="text-gray-600">{data.tip}</div>
            {data.samples?.length > 0 && (
              <>
                <p className="pt-2 text-xs text-muted-foreground">Recent overrides:</p>
                <div className="mt-2 border rounded max-h-40 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted"><tr><th className="px-2 py-1 text-left">Tx</th><th className="px-2 py-1 text-left">Merchant</th><th className="px-2 py-1 text-left">Splits</th></tr></thead>
                    <tbody>
                      {data.samples.map((s:any)=>(
                        <tr key={s.txId} className="border-t">
                          <td className="px-2 py-1 font-mono">{s.txId.slice(0,6)}</td>
                          <td className="px-2 py-1">{s.merchant}</td>
                          <td className="px-2 py-1">{(s.splits||[]).map((x:any)=>`${x.envId}:${(x.amountCents/100).toFixed(2)}`).join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ) : <div className="text-sm text-gray-600">Computing…</div>}
      </DialogContent>
    </Dialog>
  )
}
