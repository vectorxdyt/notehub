'use client';

import {AudioLines, Pause, Play, Square} from 'lucide-react';
import {useEffect, useState} from 'react';
import {type Locale, translate} from '@/lib/i18n';
import {lessonNarrationText} from '@/lib/accessibility';
import type {Lesson} from '@/lib/lessons';

type NarrationState = 'idle' | 'speaking' | 'paused';

export default function NarrationControls({lesson, locale, notify}: {lesson: Lesson; locale: Locale; notify: (message: string) => void}) {
  const [state, setState] = useState<NarrationState>('idle');
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [lesson.id, locale, supported]);

  function startOrToggle() {
    if (!supported) { notify(translate(locale, 'narrationUnavailable')); return; }
    if (state === 'speaking') { window.speechSynthesis.pause(); setState('paused'); return; }
    if (state === 'paused') { window.speechSynthesis.resume(); setState('speaking'); return; }
    const utterance = new SpeechSynthesisUtterance(lessonNarrationText(lesson));
    // Teacher-authored notes are preserved verbatim; the selected interface language chooses the voice.
    utterance.lang = locale === 'es' ? 'es-US' : 'en-US';
    utterance.rate = 0.92;
    utterance.onend = () => { setState('idle'); notify(translate(locale, 'narrationFinished')); };
    utterance.onerror = () => setState('idle');
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setState('speaking');
  }

  function stop() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setState('idle');
  }

  const actionLabel = state === 'speaking' ? translate(locale, 'pauseNarration') : state === 'paused' ? translate(locale, 'resumeNarration') : translate(locale, 'readLesson');
  return <div className="narration-controls" role="group" aria-label={translate(locale, 'readLesson')}>
    <button className="narration-button" onClick={startOrToggle} aria-label={actionLabel} title={actionLabel}>
      {state === 'speaking' ? <Pause size={16}/> : state === 'paused' ? <Play size={16}/> : <AudioLines size={16}/>}
      <span>{actionLabel}</span>
    </button>
    <button className="icon-button narration-stop" onClick={stop} disabled={state === 'idle'} aria-label={translate(locale, 'stopNarration')} title={translate(locale, 'stopNarration')}><Square size={14}/></button>
  </div>;
}
