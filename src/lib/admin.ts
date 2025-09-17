import { getApps, initializeApp, applicationDefault, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT

const app: App = getApps()[0] ?? initializeApp({
  credential: applicationDefault(),
  projectId, // <- critical to avoid the placeholder
})

const adminAuth = getAuth(app)
const adminDb = getFirestore(app)
adminDb.settings({ ignoreUndefinedProperties: true })

export { adminAuth, adminDb }
