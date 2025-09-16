import { test, expect } from '@playwright/test'

const base = process.env.BASE_URL || 'http://localhost:9010'
const h = { headers: { 'x-dev-auth-uid': 'dev-user' } }

test('healthz', async ({ request }) => {
  const r = await request.get(`${base}/api/healthz`)
  expect(r.status()).toBe(200)
})

test('accounts', async ({ request }) => {
  const r = await request.get(`${base}/api/accounts?tenantId=dev`, h)
  expect(r.status()).toBe(200)
})

test('transactions', async ({ request }) => {
  const r = await request.get(`${base}/api/transactions?tenantId=dev`, h)
  expect(r.status()).toBe(200)
})
