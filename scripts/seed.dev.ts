import { adminDb } from '../src/lib/admin'

async function main(){
  const uid = process.env.SEED_UID || 'dev-user'
  const tId = process.env.SEED_TENANT || 'dev'
  await adminDb.doc(`tenants/${tId}`).set({ name: 'Dev Tenant', createdAt: Date.now(), ownerUid: uid, currency: 'USD', tz: 'America/Los_Angeles', activePlanId: 'baseline' }, { merge: true })
  await adminDb.doc(`users/${uid}`).set({ displayName: 'Dev', email: 'dev@example.com', tz: 'America/Los_Angeles', tenants: { [tId]: 'owner' } }, { merge: true })

  const planId = 'baseline'
  await adminDb.doc(`tenants/${tId}/budget_plans/${planId}`).set({
    name: 'Baseline', active: true, currency: 'USD', tz: 'America/Los_Angeles',
    periodConfig: { type: 'biweekly', biweekly: { anchorDate: new Date().toISOString().slice(0,10) } },
    rolloverPolicy: { positive: 'carry', negative: 'cap_zero' },
    createdAt: Date.now(), updatedAt: Date.now()
  }, { merge: true })

  const envs = [
    { id: 'Rent', group: 'needs', type: 'fixed', plannedCents: 150000 },
    { id: 'Groceries', group: 'needs', type: 'flex', plannedCents: 40000 },
    { id: 'Fun', group: 'wants', type: 'flex', plannedCents: 20000 },
    { id: 'Dining', group: 'wants', type: 'flex', plannedCents: 10000 },
    { id: 'Transport', group: 'needs', type: 'flex', plannedCents: 5000 },
  ]
  for (const e of envs) {
    await adminDb.doc(`tenants/${tId}/budget_plans/${planId}/envelopes/${e.id}`).set(e)
  }

  const acctId = 'acct-seed'
  await adminDb.doc(`tenants/${tId}/accounts/${acctId}`).set({
    type: 'checking', name: 'Main Checking', mask: '1234', createdAt: Date.now(), updatedAt: Date.now()
  }, { merge: true })

  // Categorizer rules (simple defaults)
  const rules = [
    { id: 'groceries', merchantPattern: 'market|grocery|whole\\s*foods|trader\\s*joes', envId: 'Groceries', pct: 100 },
    { id: 'dining', merchantPattern: 'pizza|burger|cafe|coffee|restaurant', envId: 'Dining', pct: 100 },
    { id: 'fuel', merchantPattern: 'shell|chevron|bp|gas|fuel', envId: 'Transport', pct: 100 },
  ]
  for (const r of rules) {
    await adminDb.doc(`tenants/${tId}/categorizer_rules/${r.id}`).set(r, { merge: true })
  }
}

main().catch(e=>{ console.error(e); process.exit(1) })
