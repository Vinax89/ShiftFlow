// scripts/seed.dev.ts
import { adminDb } from '../src/lib/admin'

async function main(){
  const uid = process.env.SEED_UID || 'dev-user'
  const tId = process.env.SEED_TENANT || 'dev'
  await adminDb.doc(`tenants/${tId}`).set(
    { name: 'Dev Tenant', createdAt: Date.now(), ownerUid: uid, currency: 'USD', tz: 'America/Los_Angeles' },
    { merge: true }
  )
  await adminDb.doc(`users/${uid}`).set(
    { displayName: 'Dev', email: 'dev@example.com', tz: 'America/Los_Angeles', tenants: { [tId]: 'owner' } },
    { merge: true }
  )
  const acctRef = await adminDb.collection(`tenants/${tId}/accounts`).add({
    type: 'checking', name: 'Main Checking', mask: '1234', createdAt: Date.now(), updatedAt: Date.now()
  })
  await adminDb.collection(`tenants/${tId}/categories`).add({ name: 'Rent', group: 'needs', sort: 1 })
  await adminDb.collection(`tenants/${tId}/transactions`).add({
    accountId: acctRef.id, amountCents: -150000, currency: 'USD', date: Date.now(),
    merchant: 'Landlord', status: 'posted', source: 'manual', hash: 'seed1'
  })
}
main().catch(e => { console.error(e); process.exit(1) })
