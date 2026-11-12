'use client';

import {Contrast, Languages} from 'lucide-react';
import {useEffect, useState} from 'react';
import {type Locale, translate} from '@/lib/i18n';

export default function AccessibilityControls({locale, onLocaleChange}: {locale: Locale; onLocaleChange: (locale: Locale) => void}) {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => setHighContrast(document.documentElement.dataset.contrast === 'high'), []);

  function toggleContrast() {
    const next = document.documentElement.dataset.contrast === 'high' ? 'normal' : 'high';
    document.documentElement.dataset.contrast = next;
    try { localStorage.setItem('notehub-contrast', next); } catch {}
    setHighContrast(next === 'high');
  }

  return <div className="accessibility-controls" role="group" aria-label={translate(locale, 'accessibility')}>
    <button className={highContrast ? 'contrast-toggle active' : 'contrast-toggle'} onClick={toggleContrast} aria-pressed={highContrast} aria-label={translate(locale, highContrast ? 'highContrastOn' : 'highContrastOff')} title={translate(locale, highContrast ? 'highContrastOn' : 'highContrastOff')}>
      <Contrast size={17}/><span>{translate(locale, 'highContrast')}</span>
    </button>
    <label className="language-control" title={translate(locale, 'language')}>
      <Languages size={17}/><span className="sr-only">{translate(locale, 'language')}</span>
      <select value={locale} onChange={event => onLocaleChange(event.target.value as Locale)} aria-label={translate(locale, 'language')}>
        <option value="en">EN</option>
        <option value="es">ES</option>
      </select>
    </label>
  </div>;
}
