"use client"
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Props = { tenantId: string; planId?: string; periodKey: string; envId: string }

export function AdjustButtons({ tenantId, planId, periodKey, envId }: Props){
  const [pending, start] = useTransition()
  const r = useRouter()
  const dev = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1'

  async function send(delta: number){
    const headers: HeadersInit = { 'content-type':'application/json' }
    if (dev) headers['x-dev-auth-uid'] = 'dev-user'
    await fetch('/api/budget/assign', { method: 'POST', headers, body: JSON.stringify({ tenantId, planId: planId || 'baseline', periodKey, envId, deltaCents: delta }) })
    start(() => {
      r.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button disabled={pending} onClick={() => send(-500)} className="px-2 py-1 rounded border">−$5</button>
      <button disabled={pending} onClick={() => send(500)} className="px-2 py-1 rounded border">+$5</button>
    </div>
  )
}
