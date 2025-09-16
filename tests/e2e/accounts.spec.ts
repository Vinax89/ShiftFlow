import { test, expect } from '@playwright/test'

test('accounts API responds', async ({ request }) => {
  const r = await request.get('/api/accounts?tenantId=dev')
  expect(r.status()).toBeLessThan(500)
})
