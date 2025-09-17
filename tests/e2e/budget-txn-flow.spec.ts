import { test, expect } from '@playwright/test'
const base = process.env.BASE_URL || 'http://localhost:9010'
const H = { 'x-dev-auth-uid': 'dev-user', 'content-type': 'application/json' }

async function readPeriod(request: any) {
  const r = await request.get(`${base}/api/budget/read?tenantId=dev&planId=baseline`, { headers: { 'x-dev-auth-uid': 'dev-user' } })
  expect(r.status()).toBe(200)
  return r.json()
}

test('posting a txn with a split updates envelope actuals', async ({ request }) => {
  const before = await readPeriod(request)
  const groceriesBefore = before.envelopes.find((e: any) => e.envId === 'Groceries')?.actualCents ?? 0

  const today = new Date().toISOString().slice(0,10)
  const body = { tenantId: 'dev', accountId: 'acct-seed', amountCents: -10000, currency: 'USD', dateISO: today, merchant: 'Market', splits: [{ envId: 'Groceries', amountCents: 10000 }] }
  const p = await request.post(`${base}/api/transactions`, { headers: H, data: body })
  expect(p.status()).toBe(200)

  // read again
  const after = await readPeriod(request)
  const groceriesAfter = after.envelopes.find((e: any) => e.envId === 'Groceries')?.actualCents ?? 0
  expect(groceriesAfter - groceriesBefore).toBe(10000)
})
