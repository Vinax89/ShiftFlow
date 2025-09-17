import { test, expect } from '@playwright/test'
const base = process.env.BASE_URL || 'http://localhost:9010'
const H = { 'x-dev-auth-uid': 'dev-user', 'content-type': 'application/json' }

async function readPeriod(request: any) {
  const r = await request.get(`${base}/api/budget/read?tenantId=dev`, { headers: { 'x-dev-auth-uid': 'dev-user' } })
  expect(r.status()).toBe(200)
  return r.json()
}

test('posting a txn w/out splits categorizes to Groceries and updates actuals', async ({ request }) => {
  const today = new Date().toISOString().slice(0,10)
  // Give a 5s sleep to let any previous recompute lock expire
  await new Promise(r => setTimeout(r, 5000));
  const before = await readPeriod(request)
  const g0 = before.envelopes.find((e: any) => e.envId === 'Groceries')?.actualCents ?? 0

  const body = { tenantId: 'dev', accountId: 'acct-seed', amountCents: -12345, currency: 'USD', dateISO: today, merchant: 'OAKLAND MARKET', memo: 'test' }
  const p = await request.post(`${base}/api/transactions`, { headers: H, data: JSON.stringify(body) })
  expect(p.status()).toBe(200)

  // Give a 5s sleep to let recompute finish
  await new Promise(r => setTimeout(r, 5000));
  const after = await readPeriod(request)
  const g1 = after.envelopes.find((e: any) => e.envId === 'Groceries')?.actualCents ?? 0
  expect(g1 - g0).toBe(12345)
})
