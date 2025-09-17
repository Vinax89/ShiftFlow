import { test, expect } from '@playwright/test'
const base = process.env.BASE_URL || 'http://localhost:9000'

// API dry-run returns preview
test('apply dry-run returns preview', async ({ request }) => {
  const H = { 'x-dev-auth-uid': 'dev-user', 'content-type': 'application/json' }
  const r = await request.post(`${base}/api/categorizer/apply`, { headers: H, data: JSON.stringify({ tenantId: 'dev', days: 7, dryRun: true }) })
  expect(r.ok()).toBeTruthy()
  const j = await r.json()
  expect(j.dryRun).toBeTruthy()
  expect(j).toHaveProperty('preview')
})

// UI has dry-run toggle and shows preview section after run
test('settings/categorizer dry run flow shows preview', async ({ page }) => {
  await page.goto(`${base}/settings/categorizer`)
  await expect(page.getByText('Apply rules now')).toBeVisible()
  await page.getByLabel('Days').fill('7')
  const dryToggle = page.getByText('Dry run')
  await expect(dryToggle).toBeVisible()
  await page.getByRole('button', { name: /Run/ }).click()
  await expect(page.getByText('Dry run result')).toBeVisible({ timeout: 15000 })
})
