import { getApps, initializeApp, applicationDefault, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT

if (!projectId || /YOUR_FIREBASE_PROJECT_ID/i.test(projectId)) {
  console.error('⚠ Admin projectId is invalid:', projectId)
  throw new Error('FIREBASE_PROJECT_ID not set (or placeholder). Expected shift-flow-472313')
}

const app: App = getApps()[0] ?? initializeApp({ credential: applicationDefault(), projectId })
const adminAuth = getAuth(app)
const adminDb = getFirestore(app)
adminDb.settings({ ignoreUndefinedProperties: true })

console.log('[admin] using projectId =', projectId)
export { adminAuth, adminDb }
