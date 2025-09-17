import { test, expect } from '@playwright/test';

test.describe('Budget Adjustments', () => {
  test('should allow adjusting budget envelopes', async ({ page }) => {
    await page.goto('/budget');

    // Wait for the budget data to load
    await expect(page.locator('table')).toBeVisible();

    const firstRow = page.locator('tbody tr:first-child');
    const adjustInput = firstRow.locator('input[type="number"]');
    const plusButton = firstRow.locator('button', { hasText: '+' });
    const actualCell = firstRow.locator('td:nth-child(4)');

    const initialActualValue = await actualCell.textContent();
    const initialActualCents = parseFloat(initialActualValue?.replace('$', '') ?? '0') * 100;

    const adjustmentAmount = 25;
    await adjustInput.fill(adjustmentAmount.toString());
    await plusButton.click();
    
    // Wait for the page to refresh and reflect the change
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    const newActualValue = await page.locator('tbody tr:first-child td:nth-child(4)').textContent();
    const newActualCents = parseFloat(newActualValue?.replace('$', '') ?? '0') * 100;

    expect(newActualCents).toBe(initialActualCents + (adjustmentAmount * 100));
  });
});
