import { test, expect } from '@playwright/test'
const base = process.env.BASE_URL || 'http://localhost:9000'

test('apply and undo endpoints respond', async ({ request }) => {
  const apply = await request.post(`${base}/api/categorizer/rules/apply`, {
    headers: { 'x-dev-auth-uid': 'dev-user', 'content-type': 'application/json' },
    data: JSON.stringify({ tenantId: 'dev', merchantPattern: '.*', splits:[{envId:'misc', pct:100}], limit: 5 })
  })
  expect(apply.ok()).toBeTruthy()
  const j = await apply.json(); expect(j).toHaveProperty('count')

  const undo = await request.post(`${base}/api/categorizer/rules/undo`, {
    headers: { 'x-dev-auth-uid': 'dev-user', 'content-type': 'application/json' },
    data: JSON.stringify({ tenantId: 'dev' })
  })
  expect(undo.ok()).toBeTruthy()
})
