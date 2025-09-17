import { getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Works with ADC on Cloud Workstations / Firebase Studio.
// If GOOGLE_APPLICATION_CREDENTIALS is set, Admin will use it automatically.
const app: App = getApps()[0] ?? initializeApp()

const adminAuth = getAuth(app)
const adminDb = getFirestore(app)
adminDb.settings({ ignoreUndefinedProperties: true })

export { adminAuth, adminDb }
