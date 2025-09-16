import { auth, db } from '@/lib/firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { addDoc, setDoc, doc } from 'firebase/firestore'
import { tenants } from '@/lib/db/refs'
import { adminDb } from '../src/lib/admin'

async function main(){
  const email = process.env.SEED_EMAIL!, pass = process.env.SEED_PASS!
  await signInWithEmailAndPassword(auth, email, pass)
  const tId = 'dev'
  await setDoc(doc(db, `tenants/${tId}`), { name: 'Dev Tenant', createdAt: Date.now(), ownerUid: auth.currentUser!.uid, currency: 'USD', tz: 'America/Los_Angeles' })
  await setDoc(doc(db, `users/${auth.currentUser!.uid}`), { displayName: 'Dev', email, tz: 'America/Los_Angeles', tenants: { [tId]: 'owner' } })
  const acct = await addDoc(tenants.accounts(tId), { type: 'checking', name: 'Main Checking', mask: '1234', createdAt: Date.now(), updatedAt: Date.now() })
  await addDoc(tenants.categories(tId), { name: 'Rent', group: 'needs', sort: 1 })
  await addDoc(tenants.txns(tId), { accountId: acct.id, amountCents: -150000, currency: 'USD', date: Date.now(), merchant: 'Landlord', status: 'posted', source: 'manual', hash: 'seed1' })
}
main().catch(e=>{ console.error(e); process.exit(1) })
