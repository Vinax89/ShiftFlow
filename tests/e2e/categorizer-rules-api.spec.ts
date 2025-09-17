import { test, expect } from '@playwright/test'
const base = process.env.BASE_URL || 'http://localhost:9000'

test('POST /api/categorizer/rules creates a rule', async ({ request }) => {
  const H = { 'x-dev-auth-uid': 'dev-user', 'content-type': 'application/json' }
  const mp = `TestShop_${Date.now()}`
  const r = await request.post(`${base}/api/categorizer/rules`, { headers: H, data: JSON.stringify({ tenantId: 'dev', merchantPattern: mp, envId: 'misc' }) })
  expect(r.ok()).toBeTruthy()
  const j = await r.json()
  expect(j.ok).toBeTruthy()
  expect(j.rule.merchantPattern).toBe(mp)
})
