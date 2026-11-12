'use client';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, inMemoryPersistence, setPersistence, signInWithPopup, signOut } from 'firebase/auth';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export async function signInWithGoogle(role: 'teacher' | 'viewer' = 'viewer'): Promise<{teacher: boolean; authorized: boolean}> {
  if (Object.values(config).some(value => !value)) {
    throw new Error('Firebase is not configured yet. Follow SETUP_FIREBASE.md to connect your classroom.');
  }
  const app = getApps().find(app => app.name === 'notehub-web') ?? initializeApp(config, 'notehub-web');
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await setPersistence(auth, inMemoryPersistence);
  try {
    const result = await signInWithPopup(auth, provider);
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: await result.user.getIdToken(true), role }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not sign in. Please try again.');
    return {teacher: data.teacher === true, authorized: data.authorized === true};
  } finally {
    // Keep only the server's HttpOnly session, not a persistent Firebase browser login.
    await signOut(auth);
  }
}

export function googleSignInError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case 'auth/popup-blocked': return 'Your browser blocked Google sign-in. Allow pop-ups for this site and try again.';
    case 'auth/popup-closed-by-user': case 'auth/cancelled-popup-request': return 'Sign-in was closed. Select Continue with Google to try again.';
    case 'auth/unauthorized-domain': return 'This website is not authorized yet. Add its domain in Firebase Authentication settings.';
    case 'auth/operation-not-allowed': return 'Google sign-in is not enabled yet. Enable Google in Firebase Authentication.';
    case 'auth/network-request-failed': return 'Could not reach Google. Check your connection and try again.';
    case 'auth/invalid-api-key': case 'auth/configuration-not-found': return 'Check your Firebase web app configuration and enable Authentication.';
    default: return error instanceof Error ? error.message : 'Could not sign in. Please try again.';
  }
}
