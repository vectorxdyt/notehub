'use client';

import {Moon, Sun} from 'lucide-react';
import {useEffect, useState} from 'react';
import {type Locale, translate} from '@/lib/i18n';

type Theme = 'light' | 'dark';

function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export default function ThemeToggle({locale}: {locale: Locale}) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => setTheme(currentTheme()), []);

  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    try { localStorage.setItem('notehub-theme', next); } catch {}
    setTheme(next);
  }

  const dark = theme === 'dark';
  const label = translate(locale, dark ? 'switchLight' : 'switchDark');
  return <button className="theme-toggle" onClick={toggleTheme} aria-label={label} title={label}>
    {dark ? <Sun size={17}/> : <Moon size={17}/>}
    <span>{translate(locale, dark ? 'light' : 'dark')}</span>
  </button>;
}
