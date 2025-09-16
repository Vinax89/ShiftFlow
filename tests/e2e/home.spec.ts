import { test, expect } from '@playwright/test'

test('home loads', async ({ page }) => {
  await page.goto('http://localhost:9000/')
  await expect(page.locator('body')).toBeVisible()
})
