import 'server-only';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export function firebaseAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId || projectId !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error('Firebase project configuration does not match.');
  }
  const existing = getApps().find(app => app.name === 'notehub');
  return existing ?? initializeApp({
    credential: cert({
      projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  }, 'notehub');
}
export const adminAuth = () => getAuth(firebaseAdmin());
export const firestore = () => getFirestore(firebaseAdmin());
