import { collection, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export const tenants = {
  doc: (t: string) => doc(db, `tenants/${t}`),
  accounts: (t: string) => collection(db, `tenants/${t}/accounts`),
  account: (t: string, id: string) => doc(db, `tenants/${t}/accounts/${id}`),
  categories: (t: string) => collection(db, `tenants/${t}/categories`),
  category: (t: string, id: string) => doc(db, `tenants/${t}/categories/${id}`),
  txns: (t: string) => collection(db, `tenants/${t}/transactions`),
  txn: (t: string, id: string) => doc(db, `tenants/${t}/transactions/${id}`),
  plans: (t => collection(db, `tenants/${t}/budget_plans`)),
  plan: (t: string, id: string) => doc(db, `tenants/${t}/budget_plans/${id}`),
}
