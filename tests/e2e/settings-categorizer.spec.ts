import { test, expect } from '@playwright/test'
const base = process.env.BASE_URL || 'http://localhost:9010'

test('settings/categorizer loads', async ({ page }) => {
  await page.goto(`${base}/settings/categorizer`)
  await expect(page.getByText('Categorizer Rules')).toBeVisible()
})

test('rules API roundtrip', async ({ request }) => {
  const H = { 'x-dev-auth-uid': 'dev-user', 'content-type': 'application/json' }
  const body = { merchantPattern: 'testmerchant', envId: 'TestEnv', pct: 100 }
  const p = await request.post(`${base}/api/categorizer/rules?tenantId=dev`, { headers: H, data: body })
  expect(p.status()).toBe(200)
  const g = await request.get(`${base}/api/categorizer/rules?tenantId=dev`, { headers: { 'x-dev-auth-uid': 'dev-user' } })
  expect(g.status()).toBe(200)
  const j = await g.json()
  expect(j.rules.some((r: any)=>r.merchantPattern==='testmerchant')).toBeTruthy()
})
