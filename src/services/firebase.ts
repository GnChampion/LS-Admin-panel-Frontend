import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAnalytics, type Analytics } from 'firebase/analytics'
import { getFirestore, type Firestore } from 'firebase/firestore'
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  type Auth
} from 'firebase/auth'

// Admin app Firebase config (P1 project: land-scanner-tamil-developers)
// AUTH ONLY. All data access goes through the backend API (no Firestore client SDK
// for processing data — that lives in Postgres). This module also exposes a
// Firestore `db` handle for optional admin-side client state.

// Auth is OPTIONAL for local preview (set VITE_REQUIRE_AUTH=false). The 8 module
// services are stateless and need no auth, so the console can be used without a
// Firebase login. In production set VITE_REQUIRE_AUTH=true.
export const requireAuth = (import.meta.env.VITE_REQUIRE_AUTH as string | undefined) !== 'false'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// Initialize the app whenever web config is present — Firestore needs it too.
let app: FirebaseApp | null = null
if (firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig)
}
export const db: Firestore | null = app ? getFirestore(app) : null

// Analytics (optional — only initialized when a measurementId is provided).
export const analytics: Analytics | null =
  app && firebaseConfig.measurementId ? getAnalytics(app) : null

let auth: Auth | null = null
if (app && requireAuth) {
  auth = getAuth(app)
}

// Mark the user as admin via a custom claim set in the P1 project.
// The backend's require_admin() checks token.get("admin") === true.
export const login = async (email: string, password: string) => {
  if (!auth) throw new Error('Auth disabled (preview mode)')
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    return credential.user
  } catch (error: any) {
    console.error('Admin login error:', error)
    throw new Error(getErrorMessage(error.code))
  }
}

export const logout = async () => {
  if (!auth) return
  try {
    await signOut(auth)
  } catch (error: any) {
    console.error('Logout error:', error)
    throw new Error('Failed to logout')
  }
}

export const resetPassword = async (email: string) => {
  if (!auth) return
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error: any) {
    console.error('Password reset error:', error)
    throw new Error(getErrorMessage(error.code))
  }
}

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    if (!auth) return resolve(null)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

// ID token sent as Bearer to the backend; backend verifies it against P1 + admin claim.
export const getAuthToken = async (): Promise<string | null> => {
  if (!auth || !auth.currentUser) return null
  return await auth.currentUser.getIdToken()
}

const getErrorMessage = (code: string): string => {
  const messages: Record<string, string> = {
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/too-many-requests': 'Too many attempts. Please try again later'
  }
  return messages[code] || 'Authentication error occurred'
}
