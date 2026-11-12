// npm run firebase:check -- loads .env.local without printing credentials.
import { cert, initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const required = [
  'NEXT_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY', 'TEACHER_EMAIL', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET',
];
const missing = required.filter(key => !process.env[key] || /^(your-|teacher@example)/.test(process.env[key]));
if (missing.length) {
  console.error('Complete these variables in .env.local:', missing.join(', '));
  process.exit(1);
}
if (process.env.FIREBASE_PROJECT_ID !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.error('FIREBASE_PROJECT_ID must match NEXT_PUBLIC_FIREBASE_PROJECT_ID.');
  process.exit(1);
}
const app = initializeApp({
  credential: cert({projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')}),
});
try {
  await getAuth(app).listUsers(1);
  console.log('✓ Authentication service is reachable with the admin credentials.');
  await getFirestore(app).collection('lessons').limit(1).get();
  console.log('✓ Firestore database is available.');
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!/^[a-z0-9_-]+$/.test(cloud)) throw new Error('invalid-cloud-name');
  const auth = Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`).toString('base64');
  const storageResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/ping`, {headers:{Authorization:`Basic ${auth}`}});
  if (!storageResponse.ok) throw new Error('cloudinary-connection-failed');
  console.log('✓ Cloudinary photo storage credentials are valid.');
  const configResponse = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${process.env.FIREBASE_PROJECT_ID}/config`, {
    headers: { Authorization: `Bearer ${(await app.options.credential.getAccessToken()).access_token}` },
  });
  if (!configResponse.ok) throw new Error('provider-check-unavailable');
  const authConfig = await configResponse.json();
  console.log(`✓ Authorized domains: ${(authConfig.authorizedDomains || []).join(', ')}`);
  const providerResponse = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${process.env.FIREBASE_PROJECT_ID}/defaultSupportedIdpConfigs/google.com`, {
    headers: { Authorization: `Bearer ${(await app.options.credential.getAccessToken()).access_token}` },
  });
  if (!providerResponse.ok || !(await providerResponse.json()).enabled) {
    throw new Error('google-provider-disabled');
  }
  console.log('✓ Google sign-in provider is enabled.');
  console.log('Next: deploy the rules and verify Google sign-in, upload, and student access in the browser.');
} catch (error) {
  console.error('Firebase check failed:', error.code || (['provider-check-unavailable','google-provider-disabled','invalid-cloud-name','cloudinary-connection-failed'].includes(error.message) ? error.message : 'configuration-or-access-error'));
  console.error('See SETUP_FIREBASE.md. No credentials were printed.');
  process.exitCode = 1;
} finally {
  await deleteApp(app);
}
