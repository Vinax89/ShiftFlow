import { test, expect } from '@playwright/test'
const base = process.env.BASE_URL || 'http://localhost:9010'
const h = { headers: { 'x-dev-auth-uid': 'dev-user', 'content-type':'application/json' } }

test('recompute and read current period', async ({ request }) => {
  const body = { tenantId: 'dev', planId: 'baseline', dates: [new Date().toISOString().slice(0,10)] }
  const r1 = await request.post(`${base}/api/budget/recompute`, { ...h, data: body })
  expect(r1.status()).toBe(200)
  const r2 = await request.get(`${base}/api/budget/read?tenantId=dev&planId=baseline`, { headers: h.headers })
  expect(r2.status()).toBe(200)
  const json = await r2.json()
  expect(Array.isArray(json.envelopes)).toBeTruthy()
})
