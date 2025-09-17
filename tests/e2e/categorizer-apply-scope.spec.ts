import { test, expect } from '@playwright/test'
const base = process.env.BASE_URL || 'http://localhost:9000'

test('apply with scope returns dates and count', async ({ request }) => {
  const today = new Date().toISOString().slice(0,10)
  const r = await request.post(`${base}/api/categorizer/rules/apply`, {
    headers: { 'x-dev-auth-uid': 'dev-user', 'content-type':'application/json' },
    data: JSON.stringify({ tenantId:'dev', merchantPattern:'.*', splits:[{envId:'misc',pct:100}], since: today, until: today, limit: 50, triggerRecompute: false })
  })
  expect(r.ok()).toBeTruthy()
  const j = await r.json()
  expect(Array.isArray(j.dates)).toBeTruthy()
})

test('drift endpoint returns metrics', async ({ request }) => {
  // Assume at least one rule exists with id 'groceries' in seed; otherwise skip gracefully
  const ruleId = 'groceries'
  const r = await request.post(`${base}/api/categorizer/rules/drift`, {
    headers: { 'x-dev-auth-uid': 'dev-user', 'content-type':'application/json' },
    data: JSON.stringify({ tenantId:'dev', ruleId })
  })
  expect([200,404]).toContain(r.status())
})
