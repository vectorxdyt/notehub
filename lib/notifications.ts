import 'server-only';
import webpush, {type PushSubscription} from 'web-push';
import {firestore} from './firebase-admin';
import {subscriptionId, validPushSubscription} from './notification-security.mjs';
import {getAccessPolicy} from './access';
import {approvedViewerEmail} from './access-policy';

export const notificationsConfigured = () => Boolean(
  process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY && process.env.WEB_PUSH_SUBJECT
);

function configureWebPush() {
  if (!notificationsConfigured()) throw new Error('Web push is not configured.');
  webpush.setVapidDetails(process.env.WEB_PUSH_SUBJECT!, process.env.WEB_PUSH_PUBLIC_KEY!, process.env.WEB_PUSH_PRIVATE_KEY!);
}

export async function saveSubscription(subscription: unknown, owner: {uid: string; email: string} | null = null) {
  if (!validPushSubscription(subscription)) return false;
  const value = subscription as PushSubscription;
  await firestore().collection('push_subscriptions').doc(subscriptionId(value.endpoint)).set({
    endpoint: value.endpoint,
    keys: value.keys,
    owner_uid: owner?.uid ?? null,
    owner_email: owner?.email ?? null,
    created_at: new Date().toISOString(),
  });
  return true;
}

export async function removeSubscription(endpoint: unknown) {
  if (typeof endpoint !== 'string') return false;
  await firestore().collection('push_subscriptions').doc(subscriptionId(endpoint)).delete();
  return true;
}

export async function notifySubscribers(lesson: {id: string; title: string; curriculumLesson: string}) {
  if (!notificationsConfigured()) return {sent: 0, failed: 0};
  configureWebPush();
  const policy = await getAccessPolicy();
  const snapshot = await firestore().collection('push_subscriptions').get();
  const payload = JSON.stringify({
    title: 'New calculus notes',
    body: lesson.title,
    url: `/?lesson=${encodeURIComponent(lesson.curriculumLesson)}&open=${encodeURIComponent(lesson.id)}`,
    tag: `notehub-${lesson.id}`,
  });
  let sent = 0;
  let failed = 0;
  await Promise.all(snapshot.docs.map(async doc => {
    const subscription = doc.data() as PushSubscription;
    if (!policy.publicAccess && !approvedViewerEmail((subscription as PushSubscription & {owner_email?: string}).owner_email, policy, process.env.TEACHER_EMAIL)) {
      await doc.ref.delete();
      return;
    }
    if (!validPushSubscription(subscription)) { failed++; await doc.ref.delete(); return; }
    try {
      await webpush.sendNotification(subscription, payload, {TTL: 86400, urgency: 'high'});
      sent++;
    } catch (error) {
      failed++;
      const statusCode = (error as {statusCode?: number}).statusCode;
      if (statusCode === 404 || statusCode === 410) await doc.ref.delete();
      else console.error('Notehub push notification failed:', statusCode || 'unknown');
    }
  }));
  return {sent, failed};
}
