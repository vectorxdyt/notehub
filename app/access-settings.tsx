'use client';

import {ShieldCheck} from 'lucide-react';
import {useEffect, useState} from 'react';
import {translate, type Locale} from '@/lib/i18n';

type Policy = {publicAccess: boolean; allowedEmails: string[]};

export default function AccessSettings({locale, notify, onSaved}: {locale: Locale; notify: (message: string) => void; onSaved: (policy: Policy) => void}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publicAccess, setPublicAccess] = useState(true);
  const [emails, setEmails] = useState('');
  const [error, setError] = useState('');
  const tr = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/access');
        const data = await response.json();
        if (!response.ok) throw new Error(tr('accessLoadError'));
        if (!active) return;
        setPublicAccess(data.publicAccess === true);
        setEmails(Array.isArray(data.allowedEmails) ? data.allowedEmails.join('\n') : '');
      } catch (loadError) { if (active) setError((loadError as Error).message); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [locale]);

  async function save() {
    setSaving(true);
    setError('');
    const allowedEmails = emails.split(/[\n,;]+/).map(email => email.trim()).filter(Boolean);
    try {
      const response = await fetch('/api/access', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({publicAccess, allowedEmails})});
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 400 ? tr('invalidApprovedEmails') : tr('accessSaveError'));
      onSaved(data as Policy);
      notify(tr('accessSaved'));
    } catch (saveError) { setError((saveError as Error).message); }
    finally { setSaving(false); }
  }

  return <section className="teacher-panel access-panel" aria-labelledby="access-settings-title">
    <div className="teacher-panel-heading">
      <span className="teacher-panel-icon"><ShieldCheck size={21}/></span>
      <div><span className="eyebrow">{tr('teacherAccess')}</span><h2 id="access-settings-title">{tr('accessSettings')}</h2><p>{tr('accessSettingsIntro')}</p></div>
    </div>
    {loading ? <div className="settings-loading" role="status">{tr('gatheringNotes')}</div> : <div className="access-settings-form">
      <label className="access-policy-toggle"><input type="checkbox" checked={publicAccess} onChange={event => setPublicAccess(event.target.checked)}/><span><strong>{tr('publicAccess')}</strong><small>{publicAccess ? tr('publicAccessHelp') : tr('restrictedAccessHelp')}</small></span></label>
      {!publicAccess && <label className="approved-emails">{tr('approvedStudents')}<span className="field-help" id="approved-emails-help">{tr('approvedStudentsHelp')}</span><textarea value={emails} onChange={event => setEmails(event.target.value)} rows={7} placeholder={tr('approvedStudentsPlaceholder')} aria-describedby="approved-emails-help" spellCheck={false}/></label>}
      <p className="teacher-access-note"><ShieldCheck size={16}/>{tr('teacherAlwaysAccess')}</p>
      <p className="access-caveat">{tr('accessChangeCaveat')}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button full" onClick={save} disabled={saving}>{saving ? tr('savingAccess') : tr('saveAccess')}</button>
    </div>}
  </section>;
}
