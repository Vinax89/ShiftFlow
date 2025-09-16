import { test, expect } from '@playwright/test'
test('health', async ({ request }) => {
  const r = await request.get('http://localhost:9010/api/healthz')
  expect(r.status()).toBe(200)
})
test('accounts', async ({ request }) => {
  const r = await request.get('http://localhost:9010/api/accounts?tenantId=dev',
    { headers: { 'x-dev-auth-uid': 'dev-user' }})
  expect(r.status()).toBe(200)
})
test('transactions', async ({ request }) => {
  const r = await request.get('http://localhost:9010/api/transactions?tenantId=dev',
    { headers: { 'x-dev-auth-uid': 'dev-user' }})
  expect(r.status()).toBe(200)
})
