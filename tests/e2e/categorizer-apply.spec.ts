import { test, expect } from '@playwright/test'
const base = process.env.BASE_URL || 'http://localhost:9010'

// Smoke UI
test('settings/categorizer has Apply Now and tester', async ({ page }) => {
  await page.goto(`${base}/settings/categorizer`)
  await expect(page.getByText('Apply rules now')).toBeVisible()
  await expect(page.getByText('Regex tester')).toBeVisible()
})

// API
test('apply now returns JSON with counts', async ({ request }) => {
  const H = { 'x-dev-auth-uid': 'dev-user', 'content-type': 'application/json' }
  const r = await request.post(`${base}/api/categorizer/apply`, { headers: H, data: { tenantId: 'dev', days: 7 } })
  expect(r.ok()).toBeTruthy()
  const j = await r.json()
  expect(j).toHaveProperty('updated')
  expect(j).toHaveProperty('recomputed')
})
