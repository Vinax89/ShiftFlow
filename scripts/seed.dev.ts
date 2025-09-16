import { adminDb } from '../src/lib/admin'

async function main(){
  const uid = process.env.SEED_UID || 'dev-user'
  const tId = process.env.SEED_TENANT || 'dev'
  await adminDb.doc(`tenants/${tId}`).set({ name: 'Dev Tenant', createdAt: Date.now(), ownerUid: uid, currency: 'USD', tz: 'America/Los_Angeles' }, { merge: true })
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
  ]
  for (const e of envs) {
    await adminDb.doc(`tenants/${tId}/budget_plans/${planId}/envelopes/${e.id}`).set(e)
  }
}

main().catch(e=>{ console.error(e); process.exit(1) })
