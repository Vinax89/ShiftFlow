import { test, expect } from '@playwright/test';
const base = process.env.BASE_URL || 'http://localhost:9000';

test('categorizer dry-run shows reason column', async ({ page }) => {
  await page.goto(`${base}/settings/categorizer`);
  
  // Ensure the "Run" button is visible and click it to trigger a dry run
  const runButton = page.getByRole('button', { name: /Run/ });
  await expect(runButton).toBeVisible();
  await runButton.click();

  // Wait for the preview table to appear and check for the "Reason" column header
  await expect(page.getByText('Dry run result')).toBeVisible({ timeout: 15000 });
  const reasonHeader = page.getByRole('columnheader', { name: 'Reason' });
  await expect(reasonHeader).toBeVisible();
});
