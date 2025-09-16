import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT

const adminApp = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: applicationDefault(), projectId })
export const adminAuth = getAuth(adminApp)
export const adminDb = getFirestore(adminApp)
