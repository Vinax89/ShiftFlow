import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const adminApp = getApps().length ? getApps()[0] : initializeApp({ credential: applicationDefault() })
export const adminAuth = getAuth(adminApp)
export const adminDb = getFirestore(adminApp)