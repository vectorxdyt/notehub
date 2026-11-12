'use client';

import {Bell, BellRing} from 'lucide-react';
import {useEffect, useState} from 'react';
import {type Locale, translate} from '@/lib/i18n';

function applicationServerKey(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const bytes = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bytes, character => character.charCodeAt(0));
}

export default function NotificationToggle({notify, locale}: {notify: (message: string) => void; locale: Locale}) {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [publicKey, setPublicKey] = useState('');
  const [busy, setBusy] = useState(false);
  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  useEffect(() => {
    if (!supported) return;
    Promise.all([
      navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready).then(registration => registration.pushManager.getSubscription()),
      fetch('/api/notifications').then(response => response.json()),
    ]).then(([current, config]) => {
      setSubscription(current);
      if (config.enabled && config.publicKey) setPublicKey(config.publicKey);
    }).catch(() => {});
  }, [supported]);

  async function toggle() {
    if (!supported) { notify(translate(locale, 'notificationsUnsupported')); return; }
    if (!publicKey && !subscription) { notify(translate(locale, 'notificationsUnconfigured')); return; }
    setBusy(true);
    try {
      if (subscription) {
        const response = await fetch('/api/notifications', {method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({endpoint: subscription.endpoint})});
        if (!response.ok) throw new Error();
        await subscription.unsubscribe();
        setSubscription(null);
        notify(translate(locale, 'notificationsOff'));
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { notify(translate(locale, 'notificationPermission')); return; }
      const registration = await navigator.serviceWorker.ready;
      const next = await registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey)});
      const response = await fetch('/api/notifications', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(next)});
      if (!response.ok) { await next.unsubscribe(); throw new Error(); }
      setSubscription(next);
      notify(translate(locale, 'notificationsOn'));
    } catch { notify(translate(locale, 'notificationsError')); }
    finally { setBusy(false); }
  }

  const active = Boolean(subscription);
  return <button className={active ? 'notification-toggle active' : 'notification-toggle'} onClick={toggle} disabled={busy} aria-pressed={active} title={translate(locale, active ? 'turnOffNotifications' : 'notifyAboutNotes')}>
    {active ? <BellRing size={17}/> : <Bell size={17}/>}
    <span>{translate(locale, busy ? 'updating' : active ? 'alertsOn' : 'notifyMe')}</span>
  </button>;
}
