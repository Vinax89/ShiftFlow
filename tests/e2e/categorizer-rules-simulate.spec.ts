import { test, expect } from '@playwright/test'
const base = process.env.BASE_URL || 'http://localhost:9000'

// API smoke: simulate
test('POST /api/categorizer/rules/simulate returns hits/sample', async ({ request }) => {
  const r = await request.post(`${base}/api/categorizer/rules/simulate`, {
    headers: { 'x-dev-auth-uid': 'dev-user', 'content-type': 'application/json' },
    data: JSON.stringify({ tenantId: 'dev', merchantPattern: '.*', splits: [{ envId:'misc', pct:100 }], limit: 5 })
  })
  expect(r.ok()).toBeTruthy()
  const j = await r.json()
  expect(j).toHaveProperty('hits')
  expect(j).toHaveProperty('sample')
})

// UI smoke: edit then simulate
test('Popover allows editing regex/splits and simulating', async ({ page }) => {
  await page.goto(`${base}/settings/categorizer`)
  await page.getByRole('button', { name: /Run/ }).click()
  await expect(page.getByText('Dry run result')).toBeVisible({timeout: 15000});
  await page.getByRole('button', { name: 'Why?' }).first().click()
  const pattern = page.locator('input[value*="market"]').first()
  await pattern.fill('.*')
  await page.getByRole('button', { name: 'Simulate (last 100)' }).click()
  await expect(page.getByText(/Simulated/)).toBeVisible()
})
