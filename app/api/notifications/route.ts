import {configured, failure, sameOrigin, viewerAccess} from '@/lib/server';
import {notificationsConfigured, removeSubscription, saveSubscription} from '@/lib/notifications';

export const runtime = 'nodejs';

export async function GET() {
  return Response.json({
    enabled: configured() && notificationsConfigured(),
    publicKey: notificationsConfigured() ? process.env.WEB_PUSH_PUBLIC_KEY : null,
  }, {headers: {'Cache-Control': 'no-store'}});
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({error: 'Request not allowed.'}, {status: 403});
  if (!configured() || !notificationsConfigured()) return Response.json({error: 'Notifications are not configured.'}, {status: 503});
  try {
    const access = await viewerAccess();
    if (!access.authorized) return Response.json({error: 'Sign in with an approved account to enable notifications.'}, {status: 401});
    const subscription = await req.json();
    const owner = access.user && access.email ? {uid: access.user.uid, email: access.email} : null;
    if (!await saveSubscription(subscription, owner)) return Response.json({error: 'Invalid notification subscription.'}, {status: 400});
    return Response.json({subscribed: true}, {status: 201});
  } catch (error) { return failure(error); }
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return Response.json({error: 'Request not allowed.'}, {status: 403});
  try {
    const {endpoint} = await req.json();
    if (!await removeSubscription(endpoint)) return Response.json({error: 'Invalid notification subscription.'}, {status: 400});
    return Response.json({subscribed: false});
  } catch (error) { return failure(error); }
}
