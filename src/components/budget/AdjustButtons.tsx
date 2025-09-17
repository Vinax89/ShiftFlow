"use client"
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

export function AdjustButtons({ tenantId, planId, periodKey, envId }: { tenantId: string, planId: string, periodKey: string, envId: string }) {
  const [amount, setAmount] = useState(10)
  const router = useRouter()
  const { toast } = useToast()

  async function adjust(deltaCents: number) {
    const headers: HeadersInit = { 'content-type': 'application/json' }
    if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1') headers['x-dev-auth-uid'] = 'dev-user'
    const body = { tenantId, planId, periodKey, envId, deltaCents }
    const r = await fetch('/api/budget/assign', { method: 'POST', headers, body: JSON.stringify(body) })
    if (!r.ok) {
      const errorText = await r.text()
      toast({ variant: 'destructive', title: 'Adjustment failed', description: errorText })
      return
    }
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="outline" onClick={() => adjust(amount * -100)}>-</Button>
      <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-16 h-8 text-center" />
      <Button size="sm" variant="outline" onClick={() => adjust(amount * 100)}>+</Button>
    </div>
  )
}
