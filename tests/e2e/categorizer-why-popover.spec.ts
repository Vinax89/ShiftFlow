import { test, expect } from '@playwright/test'
const base = process.env.BASE_URL || 'http://localhost:9000'

test('Reason → Why? opens Popover and shows Active Switch', async ({ page }) => {
  await page.goto(`${base}/settings/categorizer`)
  await page.getByRole('button', { name: /Run/ }).click()
  await expect(page.getByText('Filter by merchant')).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: 'Why?' }).first().click()
  await expect(page.getByText('Why this rule?')).toBeVisible()
  // Switch is rendered (has role="switch" via shadcn)
  const sw = page.getByRole('switch').first()
  await expect(sw).toBeVisible()
})
