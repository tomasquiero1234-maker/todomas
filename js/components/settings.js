// Ajustes: perfil, idioma, emails, contraseña, calendario, recurrentes, exportar
import { html, useState, useEffect } from '../deps.js';
import { useApp } from '../ctx.js';
import { cls, PALETTE, weekdayName, todayISO } from '../util.js';
import { Icon, Toggle, Segmented, Avatar, Empty } from './ui.js';
import { taskRows, exportXlsx } from '../export.js';

function Section({ icon, title, children, sub }) {
  return html`<section class="card-panel settings-section">
    <div class="panel-title"><${Icon} name=${icon} size=${16} />${title}</div>
    ${sub && html`<p class="hint">${sub}</p>`}
    ${children}
  </section>`;
}

function Profile() {
  const { t, me, api, reload, toast, errorText, profiles, settings } = useApp();
  const [name, setName] = useState(me.full_name);
  const save = async (patch, msg) => {
    try {
      await api.updateProfile(me.id, patch);
      await reload();
      if (msg) toast(msg);
    } catch (e) { toast(errorText(e), 'error'); }
  };
  const used = profiles.filter((p) => p.id !== me.id).map((p) => p.color);
  return html`<${Section} icon="users" title=${t('settings.profile')}>
    <div class="profile-row">
      <${Avatar} person=${{ ...me, full_name: name || me.full_name }} size=${48} />
      <label class="field grow">
        <span>${t('settings.name')}</span>
        <div class="inline-form">
          <input value=${name} onInput=${(e) => setName(e.target.value)} maxlength="60" />
          <button class="btn ghost sm" disabled=${!name.trim() || name === me.full_name} onClick=${() => save({ full_name: name.trim() }, t('task.saved'))}>${t('save')}</button>
        </div>
      </label>
    </div>
    <div class="field">
      <span>${t('settings.color')}</span>
      <div class="swatches">
        ${PALETTE.map((c) => html`<button key=${c} class=${cls('swatch', me.color === c && 'on', used.includes(c) && 'used')}
          style=${`background:${c}`} onClick=${() => save({ color: c })} aria-label=${c}
          title=${used.includes(c) ? t('settings.colorUsed') : ''}>${me.color === c && html`<${Icon} name="check" size=${14} />`}</button>`)}
      </div>
    </div>
    <div class="field">
      <span>${t('settings.language')}</span>
      <${Segmented} small value=${me.lang} onChange=${(v) => save({ lang: v })} options=${[{ value: 'es', label: 'Español' }, { value: 'en', label: 'English' }]} />
    </div>
    <${Toggle} checked=${settings?.emails_enabled && me.email_notifications} disabled=${!settings?.emails_enabled}
      onChange=${(v) => save({ email_notifications: v })}
      label=${t('settings.emails')} hint=${settings?.emails_enabled ? t('settings.emailsHint') : t('settings.emailsOff')} />
  </${Section}>`;
}

function Password() {
  const { t, api, toast, errorText } = useApp();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (a.length < 8) return toast(t('login.pwShort'), 'error');
    if (a !== b) return toast(t('login.pwMismatch'), 'error');
    try {
      await api.updatePassword(a);
      setA(''); setB('');
      toast(t('settings.pwChanged'));
    } catch (err) { toast(errorText(err), 'error'); }
  };
  return html`<${Section} icon="lock" title=${t('settings.password')}>
    <form class="inline-form wrap" onSubmit=${submit}>
      <input type="password" autocomplete="new-password" placeholder=${t('settings.newPw')} value=${a} onInput=${(e) => setA(e.target.value)} />
      <input type="password" autocomplete="new-password" placeholder=${t('settings.repeatPw')} value=${b} onInput=${(e) => setB(e.target.value)} />
      <button class="btn ghost sm" type="submit" disabled=${!a}>${t('settings.changePw')}</button>
    </form>
  </${Section}>`;
}

function Calendar() {
  const { t, api, toast, errorText } = useApp();
  const [url, setUrl] = useState(undefined);
  useEffect(() => { api.getCalendarUrl().then(setUrl).catch(() => setUrl(null)); }, []);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast(t('settings.copied')); } catch { /* */ }
  };
  const regen = async () => {
    if (!confirm(t('settings.calRegenConfirm'))) return;
    try { setUrl(await api.regenerateCalendar()); toast(t('settings.calRegenDone')); } catch (e) { toast(errorText(e), 'error'); }
  };
  return html`<${Section} icon="calendar" title=${t('settings.calendar')} sub=${t('settings.calendarSub')}>
    ${api.mode === 'demo'
      ? html`<p class="callout">${t('settings.calDemo')}</p>`
      : url === undefined ? html`<p class="hint">…</p>`
      : url ? html`<div class="copy-row">
          <input readonly value=${url} onFocus=${(e) => e.target.select()} />
          <button class="btn primary sm" onClick=${copy}><${Icon} name="copy" size=${14} />${t('settings.copy')}</button>
        </div>
        <ol class="steps">
          <li>${t('settings.calStep1')}</li>
          <li>${t('settings.calStep2')}</li>
          <li>${t('settings.calStep3')}</li>
        </ol>
        <p class="hint">${t('settings.calNote')} <button class="link-btn" onClick=${regen}>${t('settings.calRegen')}</button></p>`
      : html`<p class="hint">${t('settings.calMissing')}</p>`}
  </${Section}>`;
}

function Recurring() {
  const { t, lang, api, reload, toast, errorText } = useApp();
  const [list, setList] = useState(null);
  const empty = { title: '', weekday: 1, due_time: '12:00', priority: 2, is_private: false, detail: '' };
  const [form, setForm] = useState(null);
  const load = () => api.listRecurring().then(setList);
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!form.title.trim()) return toast(t('new.needTitle'), 'error');
    try {
      await api.saveRecurring({ ...form, weekday: Number(form.weekday), priority: Number(form.priority) });
      setForm(null);
      await load();
      await reload();
      toast(t('task.saved'));
    } catch (e) { toast(errorText(e), 'error'); }
  };
  const remove = async (r) => {
    if (!confirm(t('settings.recDeleteConfirm', { title: r.title }))) return;
    await api.deleteRecurring(r.id);
    load();
  };
  const toggle = async (r, active) => {
    await api.saveRecurring({ ...r, active });
    load();
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e });

  return html`<${Section} icon="repeat" title=${t('settings.recurring')} sub=${t('settings.recurringSub')}>
    ${list === null ? html`<p class="hint">…</p>` : list.length === 0 && !form
      ? html`<${Empty} icon="repeat" title=${t('settings.recEmpty')} />`
      : html`<ul class="rec-list">
        ${list.map((r) => html`<li key=${r.id} class=${cls(!r.active && 'off')}>
          <div class="rec-when"><b>${weekdayName(r.weekday, lang, 'short')}</b><span>${r.due_time || ''}</span></div>
          <div class="rec-main">
            <div class="rec-title">${r.title} ${r.is_private && html`<${Icon} name="lock" size=${12} />`}</div>
            <div class="muted small">${t('settings.recEvery', { day: weekdayName(r.weekday, lang) })}${r.due_time ? ` · ${r.due_time}` : ''} · ${t(`prio.${r.priority}`)}</div>
          </div>
          <${Toggle} checked=${r.active} onChange=${(v) => toggle(r, v)} label="" />
          <button class="icon-btn sm" onClick=${() => setForm({ ...r, detail: r.detail || '', due_time: r.due_time || '' })} aria-label=${t('edit')}><${Icon} name="edit" size=${14} /></button>
          <button class="icon-btn sm" onClick=${() => remove(r)} aria-label=${t('delete')}><${Icon} name="trash" size=${14} /></button>
        </li>`)}
      </ul>`}
    ${form
      ? html`<div class="rec-form">
          <label class="field"><span>${t('field.title')}</span><input value=${form.title} onInput=${set('title')} maxlength="200" autofocus /></label>
          <div class="fields three">
            <label class="field"><span>${t('settings.recDay')}</span>
              <select value=${form.weekday} onChange=${set('weekday')}>
                ${[1, 2, 3, 4, 5, 6, 7].map((d) => html`<option value=${d}>${weekdayName(d, lang)}</option>`)}
              </select></label>
            <label class="field"><span>${t('settings.recTime')}</span><input type="time" value=${form.due_time} onInput=${set('due_time')} /></label>
            <div class="field"><span>${t('priority')}</span>
              <${Segmented} small value=${Number(form.priority)} onChange=${set('priority')} options=${[3, 2, 1].map((v) => ({ value: v, label: t(`prio.${v}`) }))} /></div>
          </div>
          <${Toggle} checked=${form.is_private} onChange=${(v) => setForm({ ...form, is_private: v })} label=${t('field.private')} hint=${t('settings.recPrivateHint')} />
          <div class="row-end">
            <button class="btn ghost sm" onClick=${() => setForm(null)}>${t('cancel')}</button>
            <button class="btn primary sm" onClick=${save}>${t('save')}</button>
          </div>
        </div>`
      : html`<button class="btn ghost sm" onClick=${() => setForm(empty)}><${Icon} name="plus" size=${14} />${t('settings.recAdd')}</button>`}
  </${Section}>`;
}

function ExportBox() {
  const { t, tasks, byId, lang, toast } = useApp();
  const run = async () => {
    try {
      await exportXlsx(taskRows(tasks, { t, byId, lang }), `TODOmas-${todayISO()}.xlsx`);
    } catch { toast(t('error.export'), 'error'); }
  };
  return html`<${Section} icon="download" title=${t('settings.export')} sub=${t('settings.exportSub')}>
    <button class="btn ghost sm" onClick=${run} disabled=${!tasks.length}><${Icon} name="download" size=${14} />${t('settings.exportBtn', { n: tasks.length })}</button>
  </${Section}>`;
}

export function SettingsPage() {
  const { t, api } = useApp();
  return html`<div class="page narrow">
    <div class="page-head"><div><h1>${t('settings.title')}</h1></div></div>
    <${Profile} />
    <${Recurring} />
    <${Calendar} />
    <${ExportBox} />
    ${api.mode !== 'demo' && html`<${Password} />`}
  </div>`;
}
