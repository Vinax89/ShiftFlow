import { test, expect } from '@playwright/test'

test('cashflow loads', async ({ page }) => {
  await page.goto('http://localhost:9000/cashflow')
  await expect(page.locator('body')).toBeVisible()
})
