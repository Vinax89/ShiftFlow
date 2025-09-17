import { test, expect } from '@playwright/test'
const base = process.env.BASE_URL || 'http://localhost:9000'

test('categorizer dry-run shows merchant chips and Apply selected', async ({ page }) => {
  await page.goto(`${base}/settings/categorizer`)
  await page.getByRole('button', { name: /Run/ }).click()
  await expect(page.getByText('Filter by merchant')).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('button', { name: /Apply selected now/ })).toBeVisible()
})
