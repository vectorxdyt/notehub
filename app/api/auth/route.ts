import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';
import { allowedTeacher } from '@/lib/security';
import { approvedStudent } from '@/lib/access-policy';
import { getAccessPolicy } from '@/lib/access';
import { configured, failure, sameOrigin, viewerAccess, SESSION_COOKIE, SESSION_SECONDS } from '@/lib/server';

export const runtime = 'nodejs';
export async function GET() {
  if (!configured()) return Response.json({teacher: false, signedIn: false, authorized: true, publicAccess: true, email: null, demo: true}, {headers: {'Cache-Control': 'no-store'}});
  try {
    const access = await viewerAccess();
    return Response.json({teacher: access.teacher, signedIn: Boolean(access.user), authorized: access.authorized, publicAccess: access.publicAccess, email: access.email, demo: false}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) { return failure(error); }
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'Request not allowed.' }, { status: 403 });
  if (!configured()) return Response.json({ error: 'Firebase is not configured yet.' }, { status: 503 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid sign-in request.' }, { status: 400 }); }
  if (!body || typeof body.idToken !== 'string' || body.idToken.length > 10000 || !['teacher', 'viewer'].includes(body.role)) {
    return Response.json({ error: 'A Google sign-in token is required.' }, { status: 400 });
  }
  try {
    const auth = adminAuth();
    const claims = await auth.verifyIdToken(body.idToken, true);
    const age = Date.now() / 1000 - claims.auth_time;
    if (!Number.isFinite(age) || age < -30 || age > 300) {
      return Response.json({ error: 'Please sign in with Google again to start a fresh session.' }, { status: 401 });
    }
    const policy = await getAccessPolicy();
    const isTeacher = allowedTeacher(claims, process.env.TEACHER_EMAIL);
    if (body.role === 'teacher' && !isTeacher) {
      return Response.json({ error: 'This Google account does not have teacher access. Choose an approved teacher account.' }, { status: 403 });
    }
    if (!isTeacher && !approvedStudent(claims, policy)) {
      return Response.json({ error: 'This Google account has not been approved for this classroom.' }, { status: 403 });
    }
    const session = await auth.createSessionCookie(body.idToken, { expiresIn: SESSION_SECONDS * 1000 });
    (await cookies()).set(SESSION_COOKIE, session, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_SECONDS,
    });
    return Response.json({ success: true, teacher: isTeacher, authorized: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Could not verify Google sign-in. Please sign in again or check your Firebase configuration.' }, { status: 401 });
  }
}
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: 'Request not allowed.' }, { status: 403 });
  (await cookies()).delete(SESSION_COOKIE);
  // Clear the previous provider's cookie during upgrades as well.
  (await cookies()).delete('notehub_session');
  return Response.json({ success: true });
}
