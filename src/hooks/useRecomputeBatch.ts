
'use client'
import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { abs } from '@/lib/url';

export function useRecomputeBatch(){
  const [progress, setProgress] = useState<{done:number,total:number}|null>(null)
  const { toast } = useToast()

  async function run(dates: string[], headers: HeadersInit){
    const unique = Array.from(new Set(dates))
    if (!unique.length) return;
    
    setProgress({ done:0, total: unique.length })
    const { id, update } = toast({ title: 'Recomputing budgets...', description: `0 of ${unique.length} complete` })

    for (let i=0; i<unique.length; i++){
      try {
        const r = await fetch(abs('/api/budget/recompute'), { method:'POST', headers, body: JSON.stringify({ tenantId:'dev', dates:[unique[i]] }) })
        if (!r.ok) throw new Error(await r.text())
        
        const newProgress = { done: i+1, total: unique.length }
        setProgress(newProgress)
        update({ id, title: 'Recomputing budgets...', description: `${newProgress.done} of ${new.total} complete` })

      } catch (e: any) {
        update({ id, title: 'Recompute failed', description: `Error on date ${unique[i]}: ${e.message}`, variant: 'destructive' })
        setProgress(null)
        return // Stop on first error
      }
    }
    
    update({ id, title: 'Recompute complete!', description: `Finished ${unique.length} dates.` })
    // briefly delay before clearing progress
    setTimeout(()=> setProgress(null), 1500)
  }
  return { progress, run }
}
