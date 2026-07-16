import { db } from './firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore'

// Thin Firestore wrapper for the ADMIN frontend client data.
//
// Backend processing data lives in Postgres (Render). This store holds
// admin-side client state only: the admin profile and a cache of analysis
// references. Every call is a no-op / returns empty when Firebase isn't
// configured (no web config present at build time).

export interface AdminProfile {
  email?: string
  displayName?: string
  isAdmin?: boolean
  createdAt?: unknown
}

export async function getAdminProfile(uid: string): Promise<AdminProfile | null> {
  if (!db) return null
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as AdminProfile) : null
}

export async function setAdminProfile(uid: string, profile: AdminProfile): Promise<void> {
  if (!db) return
  await setDoc(doc(db, 'users', uid), { ...profile, createdAt: serverTimestamp() }, { merge: true })
}

export interface AnalysisRef {
  id?: string
  ownerId?: string
  analysisId: string
  zoneId?: string
  status?: string
  createdAt?: unknown
}

export async function listAnalysisRefs(ownerId?: string): Promise<AnalysisRef[]> {
  if (!db) return []
  const base = collection(db, 'analyses')
  const q = ownerId
    ? query(base, where('ownerId', '==', ownerId), orderBy('createdAt', 'desc'))
    : query(base, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as AnalysisRef) }))
}

export async function addAnalysisRef(ref: AnalysisRef): Promise<string | null> {
  if (!db) return null
  const docRef = await addDoc(collection(db, 'analyses'), {
    ...ref,
    createdAt: serverTimestamp()
  })
  return docRef.id
}

export async function removeAnalysisRef(refId: string): Promise<void> {
  if (!db) return
  await deleteDoc(doc(db, 'analyses', refId))
}
