import { createHash } from 'node:crypto';

const PUSH_HOSTS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
  'notify.windows.com',
];

export function validPushEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) return false;
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && PUSH_HOSTS.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch { return false; }
}

export function validPushSubscription(value) {
  return Boolean(value && validPushEndpoint(value.endpoint) &&
    typeof value.keys?.p256dh === 'string' && value.keys.p256dh.length >= 40 && value.keys.p256dh.length <= 256 &&
    typeof value.keys?.auth === 'string' && value.keys.auth.length >= 16 && value.keys.auth.length <= 128);
}

export function subscriptionId(endpoint) {
  return createHash('sha256').update(endpoint).digest('hex');
}
