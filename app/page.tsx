'use client';

import {useEffect, useRef, useState} from 'react';
import {
  ArrowUpRight, BookOpen, Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight,
  Download, GraduationCap, Grid2X2, Images, LayoutList, LogOut, Search,
  SlidersHorizontal, X, ZoomIn, ZoomOut,
} from 'lucide-react';
import {examples, lessonMatchesSearch, type Lesson} from '@/lib/lessons';
import {calculusUnits, findCurriculumLesson} from '@/lib/curriculum.mjs';
import {signInWithGoogle, googleSignInError} from '@/lib/firebase-client';
import {localeFromStorage, translate, type Locale, type TranslationKey} from '@/lib/i18n';
import AccessibilityControls from './accessibility-controls';
import NarrationControls from './narration-controls';
import NotificationToggle from './notification-toggle';
import ThemeToggle from './theme-toggle';

const dateLabel = (date: string, locale: Locale) => new Date(`${date}T12:00:00`).toLocaleDateString(locale === 'es' ? 'es-US' : 'en-US', {month: 'short', day: 'numeric', year: 'numeric'});

async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  let data: Record<string, unknown> = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.');
  return data;
}

function GoogleMark() {
  return <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.5a12.3 12.3 0 0 1 0-7V15.2H5.8a20 20 0 0 0 0 17.6l6.8-5.3Z"/><path fill="#EA4335" d="M24 12.1c3 0 5.6 1 7.7 3l5.8-5.8A19.4 19.4 0 0 0 24 4 20.4 20.4 0 0 0 5.8 15.2l6.8 5.3A12 12 0 0 1 24 12.1Z"/></svg>;
}

function Modal({children, onClose, label, closeLabel, wide = false}: {children: React.ReactNode; onClose: () => void; label: string; closeLabel: string; wide?: boolean}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className={wide ? 'modal viewer-modal' : 'modal'} onCancel={onClose} aria-label={label} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  }}>
    <button className="icon-button close" onClick={onClose} aria-label={closeLabel}><X size={21}/></button>
    {children}
  </dialog>;
}

export default function Home() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [sort, setSort] = useState('newest');
  const [view, setView] = useState('grid');
  const [active, setActive] = useState<Lesson | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [authorized, setAuthorized] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [viewerEmail, setViewerEmail] = useState('');
  const [accessError, setAccessError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [locale, setLocale] = useState<Locale>('en');
  const tr = (key: TranslationKey, values?: Record<string, string | number>) => translate(locale, key, values);
  const notify = (text: string) => setMessage(text);
  const signInMessage = (signInError: unknown) => {
    const message = googleSignInError(signInError);
    if (locale === 'en') return message;
    if (message.includes('not been approved')) return tr('studentNotApproved');
    return tr('signInGenericError');
  };

  async function load() {
    setLoading(true);
    setError('');
    const [library, session] = await Promise.allSettled([api('/api/lessons'), api('/api/auth')]);
    try {
      const sessionReady = session.status === 'fulfilled';
      const canView = sessionReady ? session.value.authorized === true : library.status === 'fulfilled';
      setAuthorized(canView);
      setSignedIn(sessionReady && session.value.signedIn === true);
      setViewerEmail(sessionReady && typeof session.value.email === 'string' ? session.value.email : '');
      if (library.status === 'fulfilled') {
        const data = library.value;
        setDemo(data.demo === true);
        setLessons(data.demo === true ? examples : Array.isArray(data.lessons) ? data.lessons as Lesson[] : []);
      } else {
        setLessons([]);
        if (canView) throw library.reason;
      }
      if (!sessionReady && library.status === 'rejected') throw session.reason;
    } catch (loadError) { setError((loadError as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    try {
      setSaved(JSON.parse(localStorage.getItem('notehub-saved') || '[]'));
      changeLocale(localeFromStorage(localStorage.getItem('notehub-locale')));
    } catch {}
  }, []);
  useEffect(() => { if (!message) return; const timeout = setTimeout(() => setMessage(''), 4000); return () => clearTimeout(timeout); }, [message]);
  useEffect(() => { setZoom(false); }, [active, photoIndex]);
  useEffect(() => {
    if (!lessons.length) return;
    const params = new URLSearchParams(window.location.search);
    const destination = params.get('lesson');
    const lesson = lessons.find(item => item.id === params.get('open'));
    if (destination) setSelectedLesson(destination);
    if (lesson) { setActive(lesson); setPhotoIndex(0); }
    if (destination || lesson) history.replaceState({}, '', window.location.pathname);
  }, [lessons]);

  function changeLocale(next: Locale) {
    setLocale(next);
    document.documentElement.lang = next;
    document.title = next === 'es' ? 'notehub — Claridad después de clase' : 'notehub — A little clarity after class';
    try { localStorage.setItem('notehub-locale', next); } catch {}
  }

  function bookmark(id: string) {
    const next = saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id];
    setSaved(next);
    try { localStorage.setItem('notehub-saved', JSON.stringify(next)); }
    catch { notify(tr('bookmarksUnavailable')); }
  }

  const visible = lessons
    .filter(lesson => (!selectedLesson || lesson.curriculumLesson === selectedLesson) && (!savedOnly || saved.includes(lesson.id)) && lessonMatchesSearch(lesson, query, findCurriculumLesson(lesson.curriculumLesson)?.label || ''))
    .sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
  const selectionLabel = findCurriculumLesson(selectedLesson)?.label;
  const lessonCount = (id: string) => lessons.filter(lesson => lesson.curriculumLesson === id).length;

  async function studentSignIn() {
    setBusy(true);
    setAccessError('');
    try { await signInWithGoogle('viewer'); await load(); }
    catch (signInError) { setAccessError(signInMessage(signInError)); }
    finally { setBusy(false); }
  }

  async function downloadPdf(lesson: Lesson) {
    setPdfBusy(true);
    try {
      const response = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}/pdf`);
      if (!response.ok) {
        let detail = tr('pdfDownloadError');
        try { const data = await response.json(); if (typeof data.error === 'string') detail = data.error; } catch {}
        throw new Error(detail);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const disposition = response.headers.get('content-disposition') || '';
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] || 'lesson-notes.pdf';
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify(tr('pdfDownloadSuccess'));
    } catch (downloadError) { notify((downloadError as Error).message); }
    finally { setPdfBusy(false); }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/" aria-label={tr('home')}><span className="brand-icon"><BookOpen size={20} strokeWidth={1.9}/></span>notehub<span className="brand-dot">.</span></a>
      <div className="class-label"><span className="class-avatar"><GraduationCap size={20}/></span><div>{tr('calculus')}<small>{tr('classroomNotes')}</small></div></div>
      <nav aria-label={tr('library')}>
        <button aria-pressed={!savedOnly && !selectedLesson} className={!savedOnly && !selectedLesson ? 'nav-item active' : 'nav-item'} onClick={() => { setSavedOnly(false); setSelectedLesson(''); }}><BookOpen size={18}/>{tr('calculus')}<span>{lessons.length}</span></button>
        <button aria-pressed={savedOnly} className={savedOnly ? 'nav-item active' : 'nav-item'} onClick={() => { setSavedOnly(true); setSelectedLesson(''); }}><Bookmark size={18}/>{tr('savedNotes')}<span>{lessons.filter(lesson => saved.includes(lesson.id)).length}</span></button>
      </nav>
      <nav className="curriculum-nav" aria-label={tr('lessonOptions')}>
        <span className="nav-label">{tr('lessonsNav')}</span>
        {calculusUnits.map(unit => <details className="unit-group" key={unit.id} open={unit.id === 'unit-1' || Boolean(selectedLesson && unit.lessons.some(lesson => lesson.id === selectedLesson))}>
          <summary><span>{tr('unit')} {unit.number}<small>{unit.title}</small></span><ChevronDown size={14}/></summary>
          <div className="lesson-options">{unit.lessons.map(lesson => <button key={lesson.id} title={lesson.label} aria-label={`${lesson.label}, ${lessonCount(lesson.id)} ${tr('notesCount')}`} aria-pressed={selectedLesson === lesson.id} className={selectedLesson === lesson.id ? 'lesson-option selected' : 'lesson-option'} onClick={() => { setSelectedLesson(lesson.id); setSavedOnly(false); setQuery(''); }}><span>{lesson.code}</span>{lessonCount(lesson.id) > 0 && <small>{lessonCount(lesson.id)}</small>}</button>)}</div>
        </details>)}
        <a className="curriculum-source" href="https://portal.mathmedic.com/lesson-plans/course/AP-Calculus" target="_blank" rel="noreferrer">{tr('curriculumReference')}<ArrowUpRight size={12}/></a>
      </nav>
      <div className="sidebar-bottom"><a className="teacher-link" href="/teacher" target="_blank" rel="noreferrer"><GraduationCap size={17}/>{tr('teacherWorkspace')}<ArrowUpRight size={15}/></a></div>
    </aside>

    <div className="main-shell">
      <header className="topbar">
        <span className="breadcrumb">{tr('yourClassroom')}<span>/</span><strong>{savedOnly ? tr('savedNotes') : selectionLabel || tr('calculus')}</strong></span>
        <div className="topbar-actions">
          <span className="topbar-note"><GraduationCap size={16}/>{tr('calculus')}</span>
          <AccessibilityControls locale={locale} onLocaleChange={changeLocale}/>
          {authorized && <NotificationToggle notify={notify} locale={locale}/>}
          <ThemeToggle locale={locale}/>
          {signedIn && <button className="icon-button signout-button" title={viewerEmail ? tr('signedInAs', {email: viewerEmail}) : tr('signOut')} aria-label={tr('signOut')} onClick={async () => { try { await api('/api/auth', {method: 'DELETE'}); setActive(null); await load(); notify(tr('signedOut')); } catch (signOutError) { notify((signOutError as Error).message); } }}><LogOut size={18}/><span>{tr('signOut')}</span></button>}
        </div>
      </header>

      <main>
        {!loading && !authorized ? <section className="access-gate" aria-labelledby="access-gate-title">
          <div className="dialog-symbol"><GraduationCap size={25}/></div>
          <span className="eyebrow">{tr('studentSignIn')}</span>
          <h1 id="access-gate-title">{tr('restrictedTitle')}</h1>
          <p>{tr('restrictedDescription')}</p>
          <button className="google-button" onClick={studentSignIn} disabled={busy}><GoogleMark/>{busy ? tr('signingIn') : tr('continueGoogle')}</button>
          {accessError && <p className="form-error" role="alert">{accessError}</p>}
          <a className="teacher-link gate-teacher-link" href="/teacher" target="_blank" rel="noreferrer"><GraduationCap size={17}/>{tr('teacherAccess')}<ArrowUpRight size={15}/></a>
        </section> : <>
        <div className="page-heading">
          <div className="heading-copy"><span className="eyebrow">{tr('archiveEyebrow')}</span><h1>{savedOnly ? tr('savedLessons') : tr('calculusArchive')}</h1><p>{savedOnly ? tr('savedDescription') : tr('archiveDescription')}</p></div>
          <div className="heading-actions"><span className="archive-count">{String(lessons.length).padStart(2, '0')}<small>{tr('publishedLessons')}</small></span></div>
        </div>

        <section className="library" aria-label={tr('lessonLibrary')}>
          <div className="library-toolbar"><h2 className="section-title">{savedOnly ? tr('savedNotes') : selectionLabel || tr('allNotes')}</h2>{selectionLabel && <button className="clear-lesson" onClick={() => setSelectedLesson('')}>{tr('allLessons')}<X size={14}/></button>}</div>
          <div className="filter-row">
            <label className="search"><Search size={18}/><input placeholder={tr('searchPlaceholder')} aria-label={tr('searchNotes')} value={query} onChange={event => setQuery(event.target.value)}/>{query && <button className="icon-button" onClick={() => setQuery('')} aria-label={tr('clearSearch')}><X size={15}/></button>}</label>
            <div className="filter-controls">
              <label className="mobile-lesson-filter"><span>{tr('calculusLesson')}</span><select aria-label={tr('filterByLesson')} value={selectedLesson} onChange={event => setSelectedLesson(event.target.value)}><option value="">{tr('allCalculusLessons')}</option>{calculusUnits.map(unit => <optgroup key={unit.id} label={`${tr('unit')} ${unit.number} · ${unit.title}`}>{unit.lessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.label}</option>)}</optgroup>)}</select></label>
              <label className="sort"><SlidersHorizontal size={15}/><select aria-label={tr('sortLessons')} value={sort} onChange={event => setSort(event.target.value)}><option value="newest">{tr('newestFirst')}</option><option value="oldest">{tr('oldestFirst')}</option><option value="title">{tr('titleSort')}</option></select><ChevronDown size={13}/></label>
              <div className="view-switch"><button aria-label={tr('gridView')} aria-pressed={view === 'grid'} className={view === 'grid' ? 'selected' : ''} onClick={() => setView('grid')}><Grid2X2 size={17}/></button><button aria-label={tr('listView')} aria-pressed={view === 'list'} className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')}><LayoutList size={18}/></button></div>
            </div>
          </div>

          <div className="results-line"><span role="status" aria-live="polite">{loading ? tr('gatheringNotes') : `${visible.length} ${visible.length === 1 ? tr('lessonSingular') : tr('lessonPlural')}${selectionLabel ? ` ${tr('forLesson')} ${selectionLabel}` : ''}`}</span>{demo && <span className="demo-label"><span/>{tr('exampleClassroom')}</span>}</div>

          {error ? <div className="empty-state"><BookOpen size={32}/><h2>{tr('loadErrorTitle')}</h2><p>{error}</p><button className="secondary-button" onClick={load}>{tr('tryAgain')}</button></div>
            : loading ? <div className="lesson-grid">{[1, 2, 3].map(index => <div key={index} className="skeleton"/>)}</div>
            : visible.length === 0 ? <div className="empty-state"><BookOpen size={32}/><h2>{query ? tr('noSearchResults') : savedOnly ? tr('noSavedNotes') : selectionLabel ? tr('noLessonNotes', {lesson: selectionLabel}) : tr('emptyArchive')}</h2><p>{query ? tr('noSearchHelp') : savedOnly ? tr('noSavedHelp') : selectionLabel ? tr('noLessonHelp') : tr('emptyArchiveHelp')}</p><button className="secondary-button" onClick={() => { setQuery(''); setSelectedLesson(''); setSavedOnly(false); }}>{tr('browseAllNotes')}</button></div>
            : <div className={view === 'grid' ? 'lesson-grid' : 'lesson-grid list-view'}>{visible.map((lesson, index) => <article className="lesson-card" key={lesson.id}>
              <button className="lesson-image" onClick={() => { setActive(lesson); setPhotoIndex(0); }} aria-label={tr('openLesson', {title: lesson.title})}><img src={lesson.images[0]} alt={tr('boardNotesAlt', {title: lesson.title})} loading={index < 3 ? 'eager' : 'lazy'}/>{index === 0 && sort === 'newest' && !savedOnly && <span className="latest-label"><span/>{tr('latestLesson')}</span>}<span className="photo-count"><Images size={13}/>{lesson.images.length} {lesson.images.length === 1 ? tr('photoSingular') : tr('photoPlural')}</span><span className="image-open"><ArrowUpRight size={20}/></span></button>
              <div className="lesson-info"><div className="card-meta"><span className="topic-tag">{findCurriculumLesson(lesson.curriculumLesson)?.label || tr('calculus')}</span><span>{dateLabel(lesson.date, locale)}</span></div><button className="lesson-title" onClick={() => { setActive(lesson); setPhotoIndex(0); }}>{lesson.title}</button>{lesson.keyIdeas && <p className="card-summary">{lesson.keyIdeas}</p>}<div className="card-bottom"><button className="view-lesson" onClick={() => { setActive(lesson); setPhotoIndex(0); }} aria-label={`${tr('viewLesson')}: ${lesson.title}`}>{tr('viewLesson')}<ArrowUpRight size={15}/></button><button className={saved.includes(lesson.id) ? 'bookmark saved' : 'bookmark'} aria-label={tr(saved.includes(lesson.id) ? 'unsaveLesson' : 'saveLesson', {title: lesson.title})} aria-pressed={saved.includes(lesson.id)} onClick={() => bookmark(lesson.id)}><Bookmark size={17} fill={saved.includes(lesson.id) ? 'currentColor' : 'none'}/></button></div></div>
            </article>)}</div>}

          <div className="library-footer"><span>{tr('archiveFooter')}</span><span className="footer-mark"><BookOpen size={15}/>notehub / {new Date().getFullYear()}</span></div>
        </section>
        </>}
      </main>
    </div>

    {message && <div className="toast" role="status" aria-live="polite"><Check size={17}/>{message}</div>}

    {active && <Modal wide label={active.title} closeLabel={tr('closeDialog')} onClose={() => setActive(null)}>
      <div className="viewer-heading"><span className="topic-tag">{findCurriculumLesson(active.curriculumLesson)?.label || tr('calculus')}</span><h2>{active.title}</h2><span className="viewer-date">{dateLabel(active.date, locale)}{demo ? ` · ${tr('exampleLesson')}` : ''}</span>{active.keyIdeas && <div className="viewer-key-ideas"><strong>{tr('keyIdeas')}</strong><p>{active.keyIdeas}</p></div>}</div>
      <NarrationControls lesson={active} locale={locale} notify={notify}/>
      <div className={zoom ? 'board-view zoomed' : 'board-view'}><img src={active.images[photoIndex]} alt={tr('boardPhotoAlt', {title: active.title, number: photoIndex + 1})}/></div>
      <div className="viewer-controls"><div className="pager"><button className="icon-button" disabled={photoIndex === 0} onClick={() => setPhotoIndex(photoIndex - 1)} aria-label={tr('previousPhoto')}><ChevronLeft size={20}/></button><span>{tr('photoPosition', {current: photoIndex + 1, total: active.images.length})}</span><button className="icon-button" disabled={photoIndex === active.images.length - 1} onClick={() => setPhotoIndex(photoIndex + 1)} aria-label={tr('nextPhoto')}><ChevronRight size={20}/></button></div><div><button className="download-pdf" onClick={() => downloadPdf(active)} disabled={pdfBusy}><Download size={16}/>{pdfBusy ? tr('preparingPdf') : tr('downloadPdf')}</button><button className="icon-button" onClick={() => setZoom(!zoom)} aria-label={zoom ? tr('zoomOut') : tr('zoomIn')}>{zoom ? <ZoomOut size={20}/> : <ZoomIn size={20}/>}</button><a className="icon-button" href={active.images[photoIndex]} target="_blank" rel="noreferrer" aria-label={tr('openOriginal')}><ArrowUpRight size={20}/></a><button className="icon-button" onClick={() => bookmark(active.id)} aria-label={tr('bookmarkLesson')}><Bookmark size={19} fill={saved.includes(active.id) ? 'currentColor' : 'none'}/></button></div></div>
      {active.description && <p className="viewer-description">{active.description}</p>}
    </Modal>}
  </div>;
}
