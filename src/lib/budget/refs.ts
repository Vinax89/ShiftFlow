import { collection, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export const budgets = {
  plan: (t: string, planId: string) => doc(db, `tenants/${t}/budget_plans/${planId}`),
  envelopesCol: (t: string, planId: string) => collection(db, `tenants/${t}/budget_plans/${planId}/envelopes`),
  periodsCol: (t: string, planId: string) => collection(db, `tenants/${t}/budget_plans/${planId}/periods`),
  periodDoc: (t: string, planId: string, key: string) => doc(db, `tenants/${t}/budget_plans/${planId}/periods/${key}`),
  ledgerCol: (t: string) => collection(db, `tenants/${t}/budget_ledger`),
  txIndexDoc: (t: string, txId: string) => doc(db, `tenants/${t}/budget_tx_index/${txId}`),
}
