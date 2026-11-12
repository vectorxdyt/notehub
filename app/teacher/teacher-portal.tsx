'use client';

import {useEffect, useState, type FormEvent} from 'react';
import {
  ArrowLeft, ArrowUpRight, BookOpen, Check, GraduationCap, Images, LockKeyhole,
  LogOut, ShieldCheck, Trash2, UploadCloud, X,
} from 'lucide-react';
import {calculusUnits, findCurriculumLesson} from '@/lib/curriculum.mjs';
import {googleSignInError, signInWithGoogle} from '@/lib/firebase-client';
import {localeFromStorage, translate, type Locale, type TranslationKey} from '@/lib/i18n';
import {type Lesson} from '@/lib/lessons';
import AccessSettings from '../access-settings';
import AccessibilityControls from '../accessibility-controls';
import ThemeToggle from '../theme-toggle';

const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
const dateLabel = (date: string, locale: Locale) => new Date(`${date}T12:00:00`).toLocaleDateString(locale === 'es' ? 'es-US' : 'en-US', {month: 'short', day: 'numeric', year: 'numeric'});

async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  let data: Record<string, unknown> = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.');
  return data;
}

async function preparePhoto(file: File, locale: Locale): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error(translate(locale, 'photoTypes'));
  if (file.size > 25_000_000) throw new Error(translate(locale, 'photoUnder25'));
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 2400 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error(translate(locale, 'photoProcessingUnsupported'));
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let quality = .9;
    let result: Blob | null = null;
    do {
      result = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      quality -= .12;
    } while (result && result.size > 3_000_000 && quality > .35);
    if (!result || result.size > 3_000_000) throw new Error(translate(locale, 'photoResizeNeeded'));
    return result;
  } finally { URL.revokeObjectURL(url); }
}

function GoogleMark() {
  return <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.5a12.3 12.3 0 0 1 0-7V15.2H5.8a20 20 0 0 0 0 17.6l6.8-5.3Z"/><path fill="#EA4335" d="M24 12.1c3 0 5.6 1 7.7 3l5.8-5.8A19.4 19.4 0 0 0 24 4 20.4 20.4 0 0 0 5.8 15.2l6.8 5.3A12 12.1 0 0 1 24 12.1Z"/></svg>;
}

export default function TeacherPortal({authenticated, configured, email}: {authenticated: boolean; configured: boolean; email: string}) {
  const [locale, setLocale] = useState<Locale>('en');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(authenticated);
  const [files, setFiles] = useState<File[]>([]);
  const [keyIdeas, setKeyIdeas] = useState('');
  const [drag, setDrag] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const tr = (key: TranslationKey, values?: Record<string, string | number>) => translate(locale, key, values);
  const notify = (text: string) => setMessage(text);

  useEffect(() => {
    try { changeLocale(localeFromStorage(localStorage.getItem('notehub-locale'))); } catch {}
  }, []);
  useEffect(() => { if (!message) return; const timeout = setTimeout(() => setMessage(''), 4000); return () => clearTimeout(timeout); }, [message]);
  useEffect(() => { if (authenticated) loadLessons(); }, [authenticated]);

  function changeLocale(next: Locale) {
    setLocale(next);
    document.documentElement.lang = next;
    document.title = next === 'es' ? 'notehub — Espacio del docente' : 'notehub — Teacher workspace';
    try { localStorage.setItem('notehub-locale', next); } catch {}
  }

  async function loadLessons() {
    setLoadingLessons(true);
    try {
      const data = await api('/api/lessons');
      setLessons(Array.isArray(data.lessons) ? data.lessons as Lesson[] : []);
    } catch (loadError) { setError((loadError as Error).message); }
    finally { setLoadingLessons(false); }
  }

  async function signIn() {
    setBusy(true);
    setError('');
    try { await signInWithGoogle('teacher'); window.location.reload(); }
    catch (signInError) {
      const detail = googleSignInError(signInError);
      setError(locale === 'es' ? (detail.includes('not have teacher access') ? tr('teacherNotApproved') : tr('signInGenericError')) : detail);
    } finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    try { await api('/api/auth', {method: 'DELETE'}); window.location.href = '/'; }
    catch (signOutError) { setError((signOutError as Error).message); setBusy(false); }
  }

  function addFiles(incoming: File[]) {
    setError('');
    if (files.length + incoming.length > 8) { setError(tr('maxPhotos')); return; }
    if (incoming.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) { setError(tr('chooseValidPhotos')); return; }
    setFiles([...files, ...incoming]);
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!files.length) { setError(tr('addPhotoRequired')); return; }
    setBusy(true);
    setError('');
    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    const images: string[] = [];
    try {
      for (let index = 0; index < files.length; index++) {
        notify(tr('preparingPhoto', {current: index + 1, total: files.length}));
        const compressed = await preparePhoto(files[index], locale);
        const form = new FormData();
        form.set('file', compressed, 'board.jpg');
        const uploaded = await api('/api/uploads', {method: 'POST', body: form});
        if (typeof uploaded.url !== 'string') throw new Error(tr('invalidUploadResponse'));
        images.push(uploaded.url);
      }
      const lesson = await api('/api/lessons', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...Object.fromEntries(data), images})}) as unknown as Lesson;
      setLessons(current => [lesson, ...current]);
      formElement.reset();
      setFiles([]);
      setKeyIdeas('');
      setDrag(false);
      notify(tr('lessonPublished'));
    } catch (publishError) {
      if (images.length) {
        try { await api('/api/uploads', {method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({images})}); } catch {}
      }
      setError((publishError as Error).message);
    } finally { setBusy(false); }
  }

  async function remove(lesson: Lesson) {
    setBusy(true);
    setError('');
    try {
      await api(`/api/lessons/${encodeURIComponent(lesson.id)}`, {method: 'DELETE'});
      setLessons(current => current.filter(item => item.id !== lesson.id));
      setConfirmDelete('');
      notify(tr('lessonDeleted'));
    } catch (deleteError) { setError((deleteError as Error).message); }
    finally { setBusy(false); }
  }

  if (!authenticated) return <div className="teacher-login-shell">
    <header className="teacher-header">
      <a className="brand" href="/" aria-label={tr('home')}><span className="brand-icon"><BookOpen size={20}/></span>notehub<span className="brand-dot">.</span></a>
      <div className="teacher-header-actions"><AccessibilityControls locale={locale} onLocaleChange={changeLocale}/><ThemeToggle locale={locale}/><a className="teacher-back-link" href="/"><ArrowLeft size={16}/>{tr('studentArchive')}</a></div>
    </header>
    <main className="teacher-login-main">
      <section className="teacher-login-card" aria-labelledby="teacher-login-title">
        <span className="teacher-login-icon"><LockKeyhole size={29}/></span>
        <span className="eyebrow">{tr('teacherOnly')}</span>
        <h1 id="teacher-login-title">{tr('teacherSignInTitle')}</h1>
        <p>{tr('teacherSignInDescription')}</p>
        <button className="google-button full" onClick={signIn} disabled={busy || !configured}><GoogleMark/>{busy ? tr('connectingGoogle') : tr('continueGoogle')}</button>
        {!configured && <div className="setup-note"><BookOpen size={20}/><span>{tr('previewSetup')} {tr('setupGuide')}</span></div>}
        <p className="signin-note"><ShieldCheck size={15}/>{tr('teacherRouteProtected')}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    </main>
  </div>;

  return <div className="teacher-shell">
    <header className="teacher-header">
      <a className="brand" href="/" aria-label={tr('home')}><span className="brand-icon"><BookOpen size={20}/></span>notehub<span className="brand-dot">.</span></a>
      <div className="teacher-header-actions"><AccessibilityControls locale={locale} onLocaleChange={changeLocale}/><ThemeToggle locale={locale}/><a className="teacher-back-link" href="/"><ArrowLeft size={16}/>{tr('studentArchive')}</a><button className="teacher-signout" onClick={signOut} disabled={busy} title={email ? tr('signedInAs', {email}) : tr('signOut')}><LogOut size={16}/>{tr('signOut')}</button></div>
    </header>
    <main className="teacher-main">
      <section className="teacher-hero">
        <div><span className="eyebrow">{tr('teacherOnly')}</span><h1>{tr('teacherPortalTitle')}</h1><p>{tr('teacherPortalDescription')}</p></div>
        <span className="teacher-identity"><ShieldCheck size={16}/><span>{tr('verifiedTeacher')}<small>{email}</small></span></span>
      </section>

      <div className="teacher-dashboard">
        <section className="teacher-panel upload-panel" aria-labelledby="upload-title">
          <div className="teacher-panel-heading"><span className="teacher-panel-icon"><UploadCloud size={21}/></span><div><span className="eyebrow">{tr('addLesson')}</span><h2 id="upload-title">{tr('addCalculusNotes')}</h2><p>{tr('uploadIntro')}</p></div></div>
          <form className="teacher-upload-form" onSubmit={publish}>
            <label>{tr('lessonTitle')}<input name="title" required maxLength={120} placeholder={tr('lessonTitlePlaceholder')}/></label>
            <div className="form-row"><input type="hidden" name="topic" value="Calculus"/><label>{tr('mathMedicLesson')}<select name="curriculumLesson" defaultValue="" required><option value="" disabled>{tr('chooseLesson')}</option>{calculusUnits.map(unit => <optgroup key={unit.id} label={`${tr('unit')} ${unit.number} · ${unit.title}`}>{unit.lessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.label}</option>)}</optgroup>)}</select></label><label>{tr('lessonDate')}<input type="date" name="date" defaultValue={today()} required/></label></div>
            <label className="key-ideas-field">{tr('keyIdeas')} <span className="optional">{tr('optional')}</span><span className="field-help" id="teacher-key-ideas-help">{tr('keyIdeasHelp')}</span><textarea name="keyIdeas" maxLength={1500} placeholder={tr('keyIdeasPlaceholder')} rows={4} value={keyIdeas} onChange={event => setKeyIdeas(event.target.value)} aria-describedby="teacher-key-ideas-help teacher-key-ideas-count"/><span className="character-count" id="teacher-key-ideas-count">{keyIdeas.length.toLocaleString(locale === 'es' ? 'es-US' : 'en-US')} / 1,500</span></label>
            <label className={drag ? 'dropzone dragging' : 'dropzone'} onDragOver={event => { event.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={event => { event.preventDefault(); setDrag(false); addFiles(Array.from(event.dataTransfer.files)); }}><UploadCloud size={28}/><strong>{tr('dropPhotos')}</strong><span>{tr('choosePhotosHelp')}</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={event => { addFiles(Array.from(event.target.files || [])); event.target.value = ''; }} aria-label={tr('chooseBoardPhotos')}/></label>
            {files.length > 0 && <div className="file-list">{files.map((file, index) => <div key={`${file.name}-${index}`}><Images size={15}/><span>{index + 1}. {file.name}</span><button type="button" className="icon-button" aria-label={tr('removeFile', {name: file.name})} disabled={busy} onClick={() => setFiles(files.filter((_, fileIndex) => fileIndex !== index))}><X size={15}/></button></div>)}</div>}
            <label>{tr('context')} <span className="optional">{tr('optional')}</span><textarea name="description" maxLength={1000} placeholder={tr('contextPlaceholder')} rows={3}/></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button full" disabled={busy}>{busy ? tr('publishing') : tr('publishLesson')}<ArrowUpRight size={17}/></button>
          </form>
        </section>

        <AccessSettings locale={locale} notify={notify} onSaved={() => {}}/>
      </div>

      <section className="teacher-panel published-panel" aria-labelledby="published-title">
        <div className="teacher-panel-heading"><span className="teacher-panel-icon"><BookOpen size={21}/></span><div><span className="eyebrow">{tr('publishedLessons')}</span><h2 id="published-title">{tr('publishedLibrary')}</h2><p>{tr('publishedLibraryIntro')}</p></div><span className="published-count">{String(lessons.length).padStart(2, '0')}</span></div>
        {loadingLessons ? <div className="settings-loading" role="status">{tr('gatheringNotes')}</div> : lessons.length === 0 ? <p className="teacher-empty">{tr('noPublishedLessons')}</p> : <div className="teacher-lesson-list">{lessons.map(lesson => <article key={lesson.id}>
          <div className="teacher-lesson-thumb"><img src={lesson.images[0]} alt=""/></div>
          <div className="teacher-lesson-copy"><span>{findCurriculumLesson(lesson.curriculumLesson)?.label || tr('calculus')} · {dateLabel(lesson.date, locale)}</span><h3>{lesson.title}</h3><small>{lesson.images.length} {lesson.images.length === 1 ? tr('photoSingular') : tr('photoPlural')}</small></div>
          <div className="teacher-lesson-actions"><a href={`/?open=${encodeURIComponent(lesson.id)}`}><ArrowUpRight size={15}/>{tr('viewInArchive')}</a>{confirmDelete === lesson.id ? <><button className="delete-button" onClick={() => remove(lesson)} disabled={busy}>{busy ? tr('deleting') : tr('deleteLesson')}</button><button className="secondary-button compact" onClick={() => setConfirmDelete('')}>{tr('keepLesson')}</button></> : <button className="delete-button icon-delete" onClick={() => setConfirmDelete(lesson.id)} aria-label={`${tr('deleteLesson')}: ${lesson.title}`}><Trash2 size={16}/></button>}</div>
        </article>)}</div>}
      </section>
    </main>
    {message && <div className="toast" role="status" aria-live="polite"><Check size={17}/>{message}</div>}
  </div>;
}
