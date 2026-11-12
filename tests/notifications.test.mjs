import test from 'node:test';
import assert from 'node:assert/strict';
import {subscriptionId, validPushEndpoint, validPushSubscription} from '../lib/notification-security.mjs';

test('push subscriptions accept known browser push services', () => {
  assert.equal(validPushSubscription({endpoint: 'https://fcm.googleapis.com/fcm/send/example', keys: {p256dh: 'a'.repeat(65), auth: 'b'.repeat(22)}}), true);
  assert.equal(validPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/example'), true);
  assert.equal(validPushEndpoint('https://web.push.apple.com/QH123'), true);
});

test('push subscriptions reject arbitrary endpoints and malformed keys', () => {
  assert.equal(validPushSubscription({endpoint: 'https://attacker.example/push', keys: {p256dh: 'a'.repeat(65), auth: 'b'.repeat(22)}}), false);
  assert.equal(validPushSubscription({endpoint: 'https://fcm.googleapis.com/fcm/send/example', keys: {p256dh: 'short', auth: 'short'}}), false);
});

test('subscription identifiers are deterministic without storing endpoints as document IDs', () => {
  assert.equal(subscriptionId('https://fcm.googleapis.com/a'), subscriptionId('https://fcm.googleapis.com/a'));
  assert.notEqual(subscriptionId('https://fcm.googleapis.com/a'), subscriptionId('https://fcm.googleapis.com/b'));
  assert.equal(subscriptionId('https://fcm.googleapis.com/a').length, 64);
});
